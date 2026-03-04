import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, QueryFailedError } from 'typeorm';
import { CashRegister } from './entities/cash-register.entity';
import { CashSession } from './entities/cash-session.entity';
import { CashMovement } from './entities/cash-movement.entity';
import {
  CashSessionStatus,
  CashMovementSubtype,
  CashMovementType,
} from './enums/cash.enum';
import { PaymentMethod } from '../payments/entities/payment.entity';
import {
  OpenCashSessionDto,
  CloseCashSessionDto,
  CreateCashMovementDto,
  CreateCashRegisterDto,
} from './dto/cash-ops.dto';
import { GetSessionHistoryDto } from './dto/get-session-history.dto';
import { TablesService } from '../tables/tables.service';
import { SettingsService } from '../settings/settings.service';
import { ReconciliationReportDto } from './dto/reconciliation-report.dto';
import { CashSummaryDto } from './dto/cash-summary.dto';
import { getNow } from '../../common/utils/date.utils';

@Injectable()
export class CashService {
  private readonly logger = new Logger(CashService.name);

  constructor(
    @InjectRepository(CashRegister)
    private readonly registerRepository: Repository<CashRegister>,
    @InjectRepository(CashSession)
    private readonly sessionRepository: Repository<CashSession>,
    @InjectRepository(CashMovement)
    private readonly movementRepository: Repository<CashMovement>,
    private readonly dataSource: DataSource,
    private readonly tablesService: TablesService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Restoran için aktif kasayı getirir (tek doğru kaynak).
   */
  async getActiveRegister(restaurantId: string): Promise<CashRegister> {
    const register = await this.registerRepository.findOneBy({
      restaurantId,
      active: true,
    });

    if (!register) {
      throw new NotFoundException('Aktif kasa bulunamadı');
    }

    return register;
  }

  /**
   * Restoran için varsayılan kasayı döner veya yoksa oluşturur.
   */
  async ensureDefaultRegister(restaurantId: string): Promise<CashRegister> {
    let register = await this.registerRepository.findOneBy({
      restaurantId,
      name: 'Genel Kasa',
    });

    if (!register) {
      register = this.registerRepository.create({
        restaurantId,
        name: 'Genel Kasa',
        active: true,
      });
      register = await this.registerRepository.save(register);
    }

    return register;
  }

  /**
   * Kasa oturumunu açar.
   */
  async openSession(
    restaurantId: string,
    userId: string,
    dto: OpenCashSessionDto,
  ): Promise<CashSession> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const registerRepository =
        queryRunner.manager.getRepository(CashRegister);
      const sessionRepository = queryRunner.manager.getRepository(CashSession);
      const movementRepository =
        queryRunner.manager.getRepository(CashMovement);

      // Seçilen kasayı lock'la; aynı kasada eşzamanlı ikinci açılışı engeller.
      const register = await registerRepository
        .createQueryBuilder('register')
        .setLock('pessimistic_write')
        .where('register.id = :id', { id: dto.cashRegisterId })
        .andWhere('register.restaurantId = :restaurantId', { restaurantId })
        .andWhere('register.active = :active', { active: true })
        .getOne();

      if (!register) {
        throw new BadRequestException(
          'Seçilen kasa aktif değil veya bulunamadı',
        );
      }

      // Hedef kasada açık oturum var mı?
      const existingSession = await sessionRepository.findOneBy({
        cashRegisterId: register.id,
        status: CashSessionStatus.OPEN,
      });

      if (existingSession) {
        throw new BadRequestException('Bu kasada zaten açık bir oturum var');
      }

      // Yeni oturum oluştur
      const session = sessionRepository.create({
        cashRegisterId: register.id,
        restaurantId,
        openedById: userId,
        openingBalance: dto.openingBalance,
        status: CashSessionStatus.OPEN,
      });

      const savedSession = await sessionRepository.save(session);

      // Açılış bakiyesi 0'dan büyükse, bunu bir hareket olarak kaydet
      if (dto.openingBalance > 0) {
        await movementRepository.save({
          cashSessionId: savedSession.id,
          type: CashMovementType.IN,
          paymentMethod: PaymentMethod.CASH,
          amount: dto.openingBalance,
          description: dto.notes || 'Kasa Açılış Bakiyesi',
          userId,
          isOpeningBalance: true,
        });
      }

      await queryRunner.commitTransaction();
      return savedSession;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof QueryFailedError) {
        const dbErrorCode = (
          error as QueryFailedError & { driverError?: { code?: string } }
        ).driverError?.code;

        if (dbErrorCode === '23505') {
          throw new BadRequestException('Bu kasada zaten açık bir oturum var');
        }

        this.logger.error(
          `[openSession] QueryFailedError (code=${dbErrorCode || 'unknown'}): ${error.message}`,
        );
        throw new BadRequestException(
          'Kasa oturumu açma işlemi başarısız oldu. Lütfen aktif kasaları ve mevcut açık oturumları kontrol edin.',
        );
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Kasa oturumunu kapatır.
   */
  async closeSession(
    userId: string,
    sessionId: string,
    dto: CloseCashSessionDto,
    queryRunner?: QueryRunner,
  ): Promise<CashSession> {
    const ownsTransaction = !queryRunner;
    const activeQueryRunner =
      queryRunner || this.dataSource.createQueryRunner();

    if (ownsTransaction) {
      await activeQueryRunner.connect();
      await activeQueryRunner.startTransaction();
    }

    try {
      const sessionRepository =
        activeQueryRunner.manager.getRepository(CashSession);
      const movementRepository =
        activeQueryRunner.manager.getRepository(CashMovement);

      const lockedSession = await sessionRepository
        .createQueryBuilder('session')
        .setLock('pessimistic_write')
        .where('session.id = :sessionId', { sessionId })
        .getOne();

      if (!lockedSession) throw new NotFoundException('Oturum bulunamadı');
      if (lockedSession.status === CashSessionStatus.CLOSED) {
        throw new BadRequestException('Oturum zaten kapalı');
      }

      const session = await sessionRepository.findOne({
        where: { id: sessionId },
        relations: ['cashRegister', 'movements'],
      });

      if (!session) throw new NotFoundException('Oturum bulunamadı');

      const sessionRestaurantId =
        session.restaurantId || session.cashRegister?.restaurantId;
      if (!sessionRestaurantId) {
        throw new BadRequestException(
          'Oturum için restoran bilgisi bulunamadı',
        );
      }

      const hasOpenTables =
        await this.tablesService.hasOpenTables(sessionRestaurantId);

      const cardTipsToDistribute =
        dto.distributeCardTips && Number(dto.cardTipsToDistribute) > 0
          ? Number(dto.cardTipsToDistribute)
          : 0;

      const expectedBalanceBeforeDistribution =
        await this.calculateExpectedBalance(sessionId, activeQueryRunner);
      const expectedBalance =
        expectedBalanceBeforeDistribution - cardTipsToDistribute;

      session.status = CashSessionStatus.CLOSED;
      session.closedById = userId;
      session.closedAt = getNow();
      session.closingBalance = expectedBalance;
      session.countedBalance = dto.countedBalance;
      session.difference = dto.countedBalance - expectedBalance;
      session.closedWithOpenTables = hasOpenTables;

      const savedSession = await sessionRepository.save(session);

      if (cardTipsToDistribute > 0) {
        await movementRepository.save({
          cashSessionId: savedSession.id,
          type: CashMovementType.OUT,
          paymentMethod: PaymentMethod.CASH,
          amount: cardTipsToDistribute,
          description: 'Kart bahşişi kasadan dağıtıldı',
          userId,
          isTip: true,
        });
      }

      // Kapanış farkı varsa (eksik/fazla), bunu bir hareket olarak kaydet
      if (session.difference !== 0) {
        await movementRepository.save({
          cashSessionId: savedSession.id,
          type:
            session.difference > 0 ? CashMovementType.IN : CashMovementType.OUT,
          paymentMethod: PaymentMethod.CASH,
          amount: Math.abs(session.difference),
          description: `Kasa Kapanış Farkı (${session.difference > 0 ? 'Fazla' : 'Eksik'})`,
          userId,
          isClosingDifference: true,
        });
      }

      if (ownsTransaction) {
        await activeQueryRunner.commitTransaction();
      }

      return savedSession;
    } catch (error) {
      if (ownsTransaction) {
        await activeQueryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (ownsTransaction) {
        await activeQueryRunner.release();
      }
    }
  }

  private async calculateExpectedBalance(
    sessionId: string,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const movementRepository = queryRunner
      ? queryRunner.manager.getRepository(CashMovement)
      : this.movementRepository;
    const sessionRepository = queryRunner
      ? queryRunner.manager.getRepository(CashSession)
      : this.sessionRepository;

    const session = await sessionRepository.findOneBy({ id: sessionId });
    if (!session) {
      throw new NotFoundException('Oturum bulunamadı');
    }

    const movements = await movementRepository.findBy({
      cashSessionId: sessionId,
    });

    const netCashChange = movements.reduce((acc, mov) => {
      if (mov.paymentMethod !== PaymentMethod.CASH) return acc;
      if (mov.type === CashMovementType.OUT) return acc - Number(mov.amount);
      return acc + Number(mov.amount);
    }, 0);

    return Number(session.openingBalance) + netCashChange;
  }

  /**
   * Manuel kasa hareketi ekler (Para yatırma / Para çekme).
   */
  async addMovement(
    userId: string,
    sessionId: string,
    dto: CreateCashMovementDto,
    queryRunner?: QueryRunner, // Add queryRunner as an optional parameter
  ): Promise<CashMovement> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(CashMovement)
      : this.movementRepository;
    const sessionRepository = queryRunner
      ? queryRunner.manager.getRepository(CashSession)
      : this.sessionRepository;

    const session = await sessionRepository.findOneBy({ id: sessionId });

    if (!session) throw new NotFoundException('Oturum bulunamadı');
    if (session.status === CashSessionStatus.CLOSED)
      throw new BadRequestException('Kapalı oturuma hareket eklenemez');
    if (Number(dto.amount) <= 0) {
      throw new BadRequestException('Hareket tutarı sıfırdan büyük olmalıdır');
    }

    const movement = repository.create({
      ...dto,
      cashSessionId: sessionId,
      userId,
      subtype: dto.subtype || null,
      isManualCashIn:
        dto.type === CashMovementType.IN &&
        !dto.isTip &&
        !dto.isOpeningBalance &&
        !dto.isClosingDifference &&
        !dto.isVoid,
      isManualCashOut:
        dto.type === CashMovementType.OUT &&
        !dto.isTip &&
        !dto.isOpeningBalance &&
        !dto.isClosingDifference &&
        !dto.isVoid,
    });

    return repository.save(movement);
  }

  async createRegister(
    restaurantId: string,
    dto: CreateCashRegisterDto,
  ): Promise<CashRegister> {
    const existingRegister = await this.registerRepository.findOneBy({
      restaurantId,
      name: dto.name,
    });

    if (existingRegister) {
      throw new BadRequestException('Bu isimde bir kasa zaten mevcut.');
    }

    const register = this.registerRepository.create({
      ...dto,
      restaurantId,
    });
    return this.registerRepository.save(register);
  }

  /**
   * Restoranın tüm kasalarını ve aktif oturum durumlarını getirir.
   */
  async getRegisters(restaurantId: string): Promise<any[]> {
    const registersWithSessions = await this.registerRepository
      .createQueryBuilder('register')
      .leftJoinAndSelect(
        'register.sessions',
        'session',
        'session.status = :status',
        { status: CashSessionStatus.OPEN },
      )
      .leftJoinAndSelect('session.openedBy', 'openedBy')
      .leftJoinAndSelect('session.movements', 'movement')
      .where('register.restaurantId = :restaurantId', { restaurantId })
      .andWhere('register.active = :active', { active: true })
      .getMany();

    const result: any[] = [];

    for (const reg of registersWithSessions) {
      const activeSession = reg.sessions.length > 0 ? reg.sessions[0] : null;

      if (activeSession) {
        const netCashChange = activeSession.movements.reduce((acc, mov) => {
          if (mov.paymentMethod !== PaymentMethod.CASH) return acc;
          if (mov.type === CashMovementType.OUT)
            return acc - Number(mov.amount);
          return acc + Number(mov.amount);
        }, 0);

        result.push({
          ...reg,
          status: 'open',
          activeSession: {
            id: activeSession.id,
            openedAt: activeSession.openedAt,
            openedBy: activeSession.openedBy,
            openingBalance: Number(activeSession.openingBalance),
            currentBalance:
              Number(activeSession.openingBalance) + netCashChange,
          },
        });
      } else {
        result.push({
          ...reg,
          status: 'closed',
          activeSession: null,
        });
      }
    }

    return result;
  }

  /**
   * Tüm kasa oturumlarını filtrelerle getirir (raporlama için).
   */
  async getSessionHistory(
    restaurantId: string,
    filters: GetSessionHistoryDto,
  ): Promise<{
    items: CashSession[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.cashRegister', 'register')
      .leftJoinAndSelect('session.openedBy', 'openedBy')
      .leftJoinAndSelect('session.closedBy', 'closedBy')
      .where('register.restaurantId = :restaurantId', { restaurantId })
      .orderBy('session.openedAt', 'DESC');

    if (filters.startDate) {
      queryBuilder.andWhere('session.openedAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('session.openedAt <= :endDate', {
        endDate: new Date(filters.endDate + 'T23:59:59'),
      });
    }

    if (filters.registerId) {
      queryBuilder.andWhere('session.cashRegisterId = :registerId', {
        registerId: filters.registerId,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('session.status = :status', {
        status: filters.status,
      });
    }

    if (filters.openedById) {
      queryBuilder.andWhere('session.openedById = :openedById', {
        openedById: filters.openedById,
      });
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Belirli bir oturumun hareketlerini getirir.
   */
  async getMovements(sessionId: string): Promise<CashMovement[]> {
    return this.movementRepository.find({
      where: { cashSessionId: sessionId },
      order: { created_at: 'DESC' } as any,
    });
  }

  /**
   * Belirli bir kasanın tüm oturumlarını getirir.
   */
  async getSessions(registerId: string): Promise<CashSession[]> {
    return this.sessionRepository.find({
      where: { cashRegisterId: registerId },
      order: { openedAt: 'DESC' },
      relations: ['openedBy', 'closedBy'],
    });
  }

  /**
   * Belirli bir oturumu ID'sine göre getirir, hareketleri ve ilgili kullanıcı bilgileriyle birlikte.
   */
  async getSessionById(sessionId: string): Promise<CashSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['movements', 'cashRegister', 'openedBy', 'closedBy'],
      order: { movements: { created_at: 'DESC' } as any },
    });

    if (!session) {
      throw new NotFoundException('Kasa oturumu bulunamadı');
    }

    return session;
  }

  /**
   * Belirli bir oturum için tam mutabakat raporu (Reconciliation Report) oluşturur.
   */
  async getReconciliationReport(
    restaurantId: string,
    sessionId: string,
  ): Promise<ReconciliationReportDto> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, cashRegister: { restaurantId } },
      relations: ['openedBy', 'closedBy', 'cashRegister', 'movements'],
    });

    if (!session) {
      throw new NotFoundException('Kasa oturumu bulunamadı');
    }

    const tipCommissionRate = await this.settingsService.getSetting(
      restaurantId,
      'tip_commission_rate',
      0,
    );

    const report = new ReconciliationReportDto();
    report.sessionOpenedAt = session.openedAt;
    report.sessionClosedAt = session.closedAt;
    report.openedBy = session.openedBy
      ? `${session.openedBy.first_name} ${session.openedBy.last_name}`
      : 'Bilinmiyor';
    report.closedBy = session.closedBy
      ? `${session.closedBy.first_name} ${session.closedBy.last_name}`
      : null;
    report.cashRegisterName = session.cashRegister.name;
    report.openingBalance = Number(session.openingBalance);
    report.actualCash = session.countedBalance
      ? Number(session.countedBalance)
      : null;
    report.difference = session.difference ? Number(session.difference) : null;
    report.movementCount = session.movements.length;

    let totalGrossSales = 0;
    let voidedSales = 0;
    const salesByMethod: Record<string, number> = {};
    let totalTip = 0;
    let tipCommission = 0;

    for (const movement of session.movements) {
      const amount = Number(movement.amount);

      if (movement.type === CashMovementType.SALE) {
        // İptal/Void kontrolü (açıklama üzerinden)
        if (movement.isVoid) {
          voidedSales += Math.abs(amount);
        } else {
          totalGrossSales += amount;
          salesByMethod[movement.paymentMethod] =
            (salesByMethod[movement.paymentMethod] || 0) + amount;
        }
      }

      // Bahşiş kontrolü
      if (movement.type === CashMovementType.IN && movement.isTip) {
        totalTip += amount;
        // Kartlı ödemelerde komisyon hesapla
        if (movement.paymentMethod !== PaymentMethod.CASH) {
          // NOT: tipCommissionRate zaten oran (örn: 0.02) olarak saklanıyor, 100'e tekrar bölmeye gerek yok.
          tipCommission += amount * Number(tipCommissionRate);
        }
      }
    }

    report.totalGrossSales = totalGrossSales;
    report.voidedSales = voidedSales;
    report.salesByMethod = salesByMethod;
    report.totalTip = totalTip;
    report.tipCommission = tipCommission;
    report.netTip = totalTip - tipCommission;
    report.manualCashInTotal = session.movements
      .filter(
        (m) =>
          m.isManualCashIn &&
          m.subtype !== CashMovementSubtype.ADJUSTMENT &&
          m.subtype !== CashMovementSubtype.EXPENSE,
      )
      .reduce((sum, m) => sum + Number(m.amount), 0);
    report.expenseTotal = session.movements
      .filter(
        (m) => m.isManualCashOut && m.subtype === CashMovementSubtype.EXPENSE,
      )
      .reduce((sum, m) => sum + Number(m.amount), 0);
    report.adjustmentInTotal = session.movements
      .filter(
        (m) => m.isManualCashIn && m.subtype === CashMovementSubtype.ADJUSTMENT,
      )
      .reduce((sum, m) => sum + Number(m.amount), 0);
    report.adjustmentOutTotal = session.movements
      .filter(
        (m) =>
          m.isManualCashOut && m.subtype === CashMovementSubtype.ADJUSTMENT,
      )
      .reduce((sum, m) => sum + Number(m.amount), 0);
    report.cashTipDistributed = session.movements
      .filter(
        (m) =>
          m.paymentMethod === PaymentMethod.CASH &&
          m.type === CashMovementType.OUT &&
          m.isTip,
      )
      .reduce((sum, m) => sum + Number(m.amount), 0);

    // Beklenen Nakit Hesabı: Açılış + Nakit Satışlar + Nakit Girişler - Nakit Çıkışlar
    // MEAL_VOUCHER ve diğerleri hariç tutulur.
    const cashSales = salesByMethod[PaymentMethod.CASH] || 0;
    const cashIn = session.movements
      .filter(
        (m) =>
          m.paymentMethod === PaymentMethod.CASH &&
          m.type === CashMovementType.IN &&
          !m.isTip &&
          !m.isOpeningBalance &&
          !m.isClosingDifference &&
          !m.isManualCashIn,
      )
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const cashOut = session.movements
      .filter(
        (m) =>
          m.paymentMethod === PaymentMethod.CASH &&
          m.type === CashMovementType.OUT &&
          !m.isClosingDifference &&
          !m.isManualCashOut,
      )
      .reduce((sum, m) => sum + Number(m.amount), 0);

    // Bahşişler nakit ise kasaya girer (eğer öyle işleniyorsa)
    const cashTips = session.movements
      .filter(
        (m) =>
          m.paymentMethod === PaymentMethod.CASH &&
          m.type === CashMovementType.IN &&
          m.isTip,
      )
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const manualCashIn = session.movements
      .filter((m) => m.isManualCashIn)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const manualCashOut = session.movements
      .filter((m) => m.isManualCashOut)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    report.expectedCash =
      report.openingBalance +
      cashSales +
      cashIn +
      cashTips +
      manualCashIn -
      cashOut -
      manualCashOut;

    // Bankaya yatacak net miktar (Nakit HARİÇ tüm satışlar - komisyonlar)
    // Gerçek senaryoda POS komisyonu da olabilir ama şimdilik sadece Vouchers + POS toplamı
    let netBankTotal = 0;
    for (const [method, amount] of Object.entries(salesByMethod)) {
      if (method !== 'cash') {
        netBankTotal += amount;
      }
    }
    report.netBankAmount = netBankTotal;

    return report;
  }

  /**
   * Restorandaki aktif (açık) olan tüm kasa oturumlarını getirir.
   * Sipariş ödemeleri alınırken hangi kasaya işleneceğini bulmak için kullanılır.
   */
  async getAllActiveSessions(restaurantId: string): Promise<
    Array<{
      register: CashRegister;
      session: CashSession;
      currentBalance: number;
      netCashChange: number;
    }>
  > {
    const openSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.cashRegister', 'register')
      .where('register.restaurantId = :restaurantId', { restaurantId })
      .andWhere('session.status = :status', { status: CashSessionStatus.OPEN })
      .getMany();

    const result: Array<{
      register: CashRegister;
      session: CashSession;
      currentBalance: number;
      netCashChange: number;
    }> = [];

    for (const session of openSessions) {
      const movements = await this.movementRepository.findBy({
        cashSessionId: session.id,
      });

      const netCashChange = movements.reduce((acc, mov) => {
        if (mov.paymentMethod !== PaymentMethod.CASH) return acc;
        if (mov.type === CashMovementType.OUT) return acc - Number(mov.amount);
        return acc + Number(mov.amount);
      }, 0);

      result.push({
        register: session.cashRegister,
        session: session,
        currentBalance: Number(session.openingBalance) + netCashChange,
        netCashChange: netCashChange,
      });
    }

    return result;
  }

  /**
   * Belirli bir oturumun özetini getirir.
   */
  async getSessionSummary(sessionId: string): Promise<CashSummaryDto> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['movements', 'cashRegister'],
    });

    if (!session) {
      throw new NotFoundException('Kasa oturumu bulunamadı');
    }

    const summary = new CashSummaryDto();
    summary.netSales = 0;
    summary.totalTips = 0;
    summary.netTip = 0;
    summary.cashTips = 0;
    summary.cardTips = 0;
    summary.cashTipDistributed = 0;
    summary.manualCashInTotal = 0;
    summary.manualCashOutTotal = 0;
    summary.paymentBreakdown = {};

    const sessionRestaurantId =
      session.restaurantId || session.cashRegister?.restaurantId;
    const tipCommissionRate = sessionRestaurantId
      ? await this.settingsService.getSetting(
          sessionRestaurantId,
          'tip_commission_rate',
          0,
        )
      : 0;

    for (const movement of session.movements) {
      const amount = Number(movement.amount);

      if (movement.type === CashMovementType.SALE) {
        if (!movement.isVoid) {
          summary.netSales += amount;
          summary.paymentBreakdown[movement.paymentMethod] =
            (summary.paymentBreakdown[movement.paymentMethod] || 0) + amount;
        }
      } else if (movement.type === CashMovementType.IN && movement.isTip) {
        summary.totalTips += amount;
        if (movement.paymentMethod === PaymentMethod.CASH) {
          summary.cashTips += amount;
          summary.netTip += amount; // Cash tips usually have no commission
        } else {
          summary.cardTips += amount;
          summary.netTip += amount * (1 - Number(tipCommissionRate));
        }
      } else if (
        movement.type === CashMovementType.OUT &&
        movement.isTip &&
        movement.paymentMethod === PaymentMethod.CASH
      ) {
        summary.cashTipDistributed += amount;
      }
    }

    // Beklenen Nakit Hesabı: Açılış + Nakit Satışlar + Nakit Girişler - Nakit Çıkışlar
    const cashSales = summary.paymentBreakdown[PaymentMethod.CASH] || 0;
    const cashIn = session.movements
      .filter(
        (m) =>
          m.paymentMethod === PaymentMethod.CASH &&
          m.type === CashMovementType.IN &&
          !m.isTip &&
          !m.isOpeningBalance &&
          !m.isClosingDifference &&
          !m.isManualCashIn,
      )
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const cashOut = session.movements
      .filter(
        (m) =>
          m.paymentMethod === PaymentMethod.CASH &&
          m.type === CashMovementType.OUT &&
          !m.isClosingDifference &&
          !m.isManualCashOut,
      )
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const manualCashIn = session.movements
      .filter((m) => m.isManualCashIn)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const manualCashOut = session.movements
      .filter((m) => m.isManualCashOut)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    summary.manualCashInTotal = manualCashIn;
    summary.manualCashOutTotal = manualCashOut;

    summary.totalCash =
      Number(session.openingBalance) +
      cashSales +
      cashIn +
      summary.cashTips +
      manualCashIn -
      cashOut -
      manualCashOut;

    return summary;
  }

  /**
   * Belirli bir kasa oturumuna ait tüm hareketleri siler.
   * Genellikle test veya hatalı veri girişi durumlarında kullanılır.
   * DİKKAT: Bu işlem geri alınamaz.
   */
  async deleteMovementsBySession(sessionId: string): Promise<void> {
    await this.movementRepository.delete({ cashSessionId: sessionId });
  }

  /**
   * Belirli bir kasa oturumunu siler.
   * DİKKAT: Bu işlem geri alınamaz.
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionRepository.delete({ id: sessionId });
  }

  /**
   * Belirli bir kasa kaydını siler.
   * DİKKAT: Bu işlem geri alınamaz.
   */
  async deleteRegister(registerId: string): Promise<void> {
    await this.registerRepository.delete({ id: registerId });
  }
}
