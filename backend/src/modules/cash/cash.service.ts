import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { CashRegister } from './entities/cash-register.entity';
import { CashSession } from './entities/cash-session.entity';
import { CashMovement } from './entities/cash-movement.entity';
import { CashSessionStatus, CashMovementType } from './enums/cash.enum';
import { PaymentMethod } from '../payments/entities/payment.entity';
import {
  OpenCashSessionDto,
  CloseCashSessionDto,
  CreateCashMovementDto,
} from './dto/cash-ops.dto';
import { RulesService } from '../rules/rules.service';
import { TablesService } from '../tables/tables.service';
import { RuleKey } from '../rules/enums/rule-key.enum';
import { NotificationsGateway } from '../notifications/notifications.gateway';

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
    private readonly rulesService: RulesService,
    private readonly tablesService: TablesService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

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
    const register = await this.registerRepository.findOneBy({
      id: dto.cashRegisterId,
      restaurantId,
    });
    if (!register) throw new NotFoundException('Kasa bulunamadı');

    const activeSession = await this.sessionRepository.findOneBy({
      cashRegisterId: dto.cashRegisterId,
      status: CashSessionStatus.OPEN,
    });
    if (activeSession)
      throw new BadRequestException('Bu kasada zaten açık bir oturum var');

    const session = this.sessionRepository.create({
      cashRegisterId: dto.cashRegisterId,
      openedById: userId,
      openingBalance: dto.openingBalance,
      status: CashSessionStatus.OPEN,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Real-time update
    this.notificationsGateway.notifyCashSessionUpdate(restaurantId, {
      type: 'session_opened',
      registerId: dto.cashRegisterId,
      sessionId: savedSession.id,
    });

    return savedSession;
  }

  /**
   * Kasa oturumunu kapatır.
   */
  async closeSession(
    userId: string,
    sessionId: string,
    dto: CloseCashSessionDto,
  ): Promise<CashSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['movements'],
    });

    if (!session) throw new NotFoundException('Oturum bulunamadı');
    if (session.status === CashSessionStatus.CLOSED)
      throw new BadRequestException('Oturum zaten kapalı');

    // Business Rule Check: Kapatırken Açık Masa Kontrolü
    const register = await this.registerRepository.findOneBy({
      id: session.cashRegisterId,
    });
    if (register) {
      await this.rulesService.checkRule(
        register.restaurantId,
        RuleKey.CASH_CHECK_OPEN_TABLES,
        null, // No context needed for this rule as it checks all tables
        'Kasa kapatılamaz: Hala açık (hesabı ödenmemiş) masalar bulunmaktadır.',
      );
    }

    // Beklenen bakiyeyi hesapla (Açılış + Nakit Girişler - Nakit Çıkışlar)
    const movements = await this.movementRepository.findBy({
      cashSessionId: sessionId,
    });

    // NOT: Sadece CADD/CASH (Nakit) olanlar fiziki kasayı etkiler.
    // Kart çekimleri 'banka/pos' kalemi olarak raporda görülür.
    const netCashChange = movements.reduce((acc, mov) => {
      if (mov.paymentMethod !== PaymentMethod.CASH) return acc;
      if (mov.type === CashMovementType.OUT) return acc - Number(mov.amount);
      return acc + Number(mov.amount);
    }, 0);

    const expectedBalance = Number(session.openingBalance) + netCashChange;

    session.status = CashSessionStatus.CLOSED;
    session.closedById = userId;
    session.closedAt = new Date();
    session.closingBalance = expectedBalance;
    session.countedBalance = dto.countedBalance;
    session.difference = dto.countedBalance - expectedBalance;

    const savedSession = await this.sessionRepository.save(session);

    // Real-time update
    if (register) {
      this.notificationsGateway.notifyCashSessionUpdate(register.restaurantId, {
        type: 'session_closed',
        registerId: session.cashRegisterId,
        sessionId: session.id,
      });
    }

    return savedSession;
  }

  /**
   * Manuel kasa hareketi ekler.
   */
  async addMovement(
    userId: string,
    sessionId: string,
    dto: CreateCashMovementDto,
  ): Promise<CashMovement> {
    const session = await this.sessionRepository.findOneBy({
      id: sessionId,
      status: CashSessionStatus.OPEN,
    });
    if (!session)
      throw new BadRequestException(
        'Hareket eklemek için açık bir kasa oturumu olmalı',
      );

    const movement = this.movementRepository.create({
      ...dto,
      cashSessionId: sessionId,
      userId,
    });

    const savedMovement = await this.movementRepository.save(movement);

    // Real-time update
    const register = await this.registerRepository.findOneBy({
      id: session.cashRegisterId,
    });
    if (register) {
      this.notificationsGateway.notifyCashMovement(register.restaurantId, {
        sessionId,
        movement: savedMovement,
      });
    }

    return savedMovement;
  }

  /**
   * Tüm kasa oturumlarını filtrelerle getirir (raporlama için).
   */
  async getSessionHistory(
    restaurantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      registerId?: string;
      status?: CashSessionStatus;
      openedById?: string;
    },
  ): Promise<CashSession[]> {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.cashRegister', 'register')
      .leftJoinAndSelect('session.openedBy', 'openedBy')
      .leftJoinAndSelect('session.closedBy', 'closedBy')
      .where('register.restaurant_id = :restaurantId', { restaurantId })
      .orderBy('session.opened_at', 'DESC');

    if (filters.startDate) {
      queryBuilder.andWhere('session.opened_at >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('session.opened_at <= :endDate', {
        endDate: new Date(filters.endDate + 'T23:59:59'),
      });
    }

    if (filters.registerId) {
      queryBuilder.andWhere('session.cash_register_id = :registerId', {
        registerId: filters.registerId,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('session.status = :status', {
        status: filters.status,
      });
    }

    if (filters.openedById) {
      queryBuilder.andWhere('session.opened_by_id = :openedById', {
        openedById: filters.openedById,
      });
    }

    return queryBuilder.getMany();
  }

  /**
   * Verilen restoran için aktif (açık) kasa oturumunu döner.
   * Kullanıcının oturumuna, varsayılan kasaya veya herhangi bir açık oturuma öncelik sırasıyla bakar.
   */
  async findActiveSession(
    restaurantId: string,
    userId?: string,
  ): Promise<CashSession | null> {
    // Priority 1: User's open session
    if (userId) {
      const userSession = await this.sessionRepository
        .createQueryBuilder('session')
        .innerJoin('session.cashRegister', 'register')
        .where('register.restaurant_id = :restaurantId', { restaurantId })
        .andWhere('session.opened_by_id = :userId', { userId })
        .andWhere('session.status = :status', {
          status: CashSessionStatus.OPEN,
        })
        .getOne();
      if (userSession) return userSession;
    }

    // Priority 2: Default register's open session
    const register = await this.ensureDefaultRegister(restaurantId);
    const defaultSession = await this.sessionRepository.findOneBy({
      cashRegisterId: register.id,
      status: CashSessionStatus.OPEN,
    });
    if (defaultSession) return defaultSession;

    // Priority 3: ANY open session in the restaurant
    return this.dataSource
      .getRepository(CashSession)
      .createQueryBuilder('session')
      .innerJoin('session.cashRegister', 'register')
      .where('register.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('session.status = :status', { status: CashSessionStatus.OPEN })
      .orderBy('session.opened_at', 'ASC')
      .getOne();
  }

  /**
   * Ödeme ve bahşiş hareketlerini verilen EntityManager (queryRunner.manager) ile kaydeder.
   * PaymentsService'in kendi transaction'ı içinde çağrılır — atomik çalışır.
   */
  async recordPaymentMovementsInTransaction(
    manager: any,
    session: CashSession,
    restaurantId: string,
    payments: Array<{
      orderId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      tipAmount?: number | null;
      userId?: string;
    }>,
  ): Promise<void> {
    const movementRepo = manager.getRepository(CashMovement);

    for (const p of payments) {
      // Sale movement
      await movementRepo.save({
        cashSessionId: session.id,
        type: CashMovementType.SALE,
        paymentMethod: p.paymentMethod,
        amount: p.amount,
        orderId: p.orderId,
        description: `Sipariş Ödemesi (#${p.orderId.substring(0, 8)})`,
        userId: p.userId || undefined,
      });

      // Tip movement (if present)
      if (p.tipAmount && p.tipAmount > 0) {
        await movementRepo.save({
          cashSessionId: session.id,
          type: CashMovementType.IN,
          paymentMethod: p.paymentMethod,
          amount: p.tipAmount,
          orderId: p.orderId,
          description: `Bahşiş (#${p.orderId.substring(0, 8)})`,
          userId: p.userId || undefined,
        });
      }
    }

    // Real-time notification (fire-and-forget, not part of transaction)
    this.notificationsGateway.notifyCashMovement(restaurantId, {
      sessionId: session.id,
      type: 'sale',
      amount: payments.reduce((sum, p) => sum + p.amount, 0),
    });
  }

  @OnEvent('payment.completed')
  async handlePaymentCompleted(event: {
    restaurantId: string;
    orderId: string;
    amount: number;
    paymentMethod: any; // Allow 'SPLIT' or PaymentMethod
    userId?: string;
    tipAmount?: number;
    payments?: Array<{
      method: PaymentMethod;
      amount: number;
      tipAmount?: number;
    }>;
  }) {
    // Cash movements are now recorded atomically inside PaymentsService transaction.
    // This event is kept for other consumers (notifications, cache invalidation, etc.)
    this.logger.log(
      `payment.completed event received for order ${event.orderId} (cash already recorded in transaction).`,
    );
  }

  /**
   * Records a sale movement to a session.
   * Supports both direct repository and transactional manager.
   */
  private async recordSaleMovement(
    session: CashSession,
    data: {
      restaurantId: string;
      orderId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      userId?: string;
    },
    manager?: any,
  ) {
    const movementRepo = manager
      ? manager.getRepository(CashMovement)
      : this.movementRepository;

    const movement = await movementRepo.save({
      cashSessionId: session.id,
      type: CashMovementType.SALE,
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      orderId: data.orderId,
      description: `Sipariş Ödemesi (#${data.orderId.substring(0, 8)})`,
      userId: data.userId || undefined,
    });

    // Real-time update for summary and movements
    this.notificationsGateway.notifyCashMovement(data.restaurantId, {
      sessionId: session.id,
      type: 'sale',
      amount: data.amount,
      paymentMethod: data.paymentMethod,
    });

    return movement;
  }

  /**
   * Records a tip movement to a session.
   * Supports both direct repository and transactional manager.
   */
  private async recordTipMovement(
    session: CashSession,
    data: {
      restaurantId: string;
      orderId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      userId?: string;
    },
    manager?: any,
  ) {
    const movementRepo = manager
      ? manager.getRepository(CashMovement)
      : this.movementRepository;

    const movement = await movementRepo.save({
      cashSessionId: session.id,
      type: CashMovementType.IN,
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      orderId: data.orderId,
      description: `Bahşiş (#${data.orderId.substring(0, 8)})`,
      userId: data.userId || undefined,
    });

    // Real-time update for summary and movements
    this.notificationsGateway.notifyCashMovement(data.restaurantId, {
      sessionId: session.id,
      type: 'in', // Using 'in' since it's an income, handled specially in cash summary
      amount: data.amount,
      paymentMethod: data.paymentMethod,
    });

    return movement;
  }

  async getRegisters(restaurantId: string): Promise<CashRegister[]> {
    return this.registerRepository.find({ where: { restaurantId } });
  }

  async getSessions(registerId: string): Promise<CashSession[]> {
    return this.sessionRepository.find({
      where: { cashRegisterId: registerId },
      order: { openedAt: 'DESC' } as any,
      relations: ['openedBy', 'closedBy'],
    });
  }

  async getMovements(sessionId: string): Promise<CashMovement[]> {
    return this.movementRepository.find({
      where: { cashSessionId: sessionId },
      order: { created_at: 'ASC' } as any,
      relations: ['user'],
    });
  }

  /**
   * Session özetini getirir (net sales, tips, etc.)
   */
  async getSessionSummary(sessionId: string): Promise<{
    netSales: number;
    totalTips: number;
    totalCash: number;
    cashTips: number;
    cardTips: number;
  }> {
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (!session) {
      throw new NotFoundException('Kasa oturumu bulunamadı');
    }

    const movements = await this.getMovements(sessionId);

    let netSales = 0;
    let totalTips = 0;
    let cashTips = 0;
    let cardTips = 0;

    for (const movement of movements) {
      // Sale movements (revenue)
      if (movement.type === CashMovementType.SALE) {
        netSales += Number(movement.amount);
      }

      // Tip movements
      if (
        movement.type === CashMovementType.IN &&
        (movement.description?.includes("Bahşiş") || movement.description?.includes("Tip"))
      ) {
        totalTips += Number(movement.amount);

        if (movement.paymentMethod === PaymentMethod.CASH) {
          cashTips += Number(movement.amount);
        } else {
          cardTips += Number(movement.amount);
        }
      }
    }

    // Total cash = opening balance + cash sales + cash tips
    const cashMovements = movements.filter(
      (m) => m.paymentMethod === PaymentMethod.CASH,
    );
    const totalCashIn = cashMovements
      .filter(
        (m) =>
          m.type === CashMovementType.SALE || m.type === CashMovementType.IN,
      )
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const totalCashOut = cashMovements
      .filter((m) => m.type === CashMovementType.OUT)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalCash =
      Number(session.openingBalance) + totalCashIn - totalCashOut;

    return {
      netSales,
      totalTips,
      totalCash,
      cashTips,
      cardTips,
    };
  }

  /**
   * Yeni kasa oluşturur.
   */
  async createRegister(
    restaurantId: string,
    name: string,
  ): Promise<CashRegister> {
    const register = this.registerRepository.create({
      restaurantId,
      name,
      active: true,
    });
    return this.registerRepository.save(register);
  }

  /**
   * Kasayı siler (soft delete - aktif durumunu false yapar)
   */
  async deleteRegister(registerId: string): Promise<void> {
    const register = await this.registerRepository.findOneBy({
      id: registerId,
    });
    if (!register) {
      throw new NotFoundException('Kasa bulunamadı');
    }

    // Aktif oturumu var mı kontrol et
    const activeSession = await this.sessionRepository.findOne({
      where: {
        cashRegisterId: registerId,
        status: CashSessionStatus.OPEN,
      },
    });

    if (activeSession) {
      throw new BadRequestException('Açık oturumu olan kasa silinemez');
    }

    // Soft delete - active false yap
    register.active = false;
    await this.registerRepository.save(register);
  }

  /**
   * Restorandaki tüm kasaları, durumlarıyla birlikte getirir.
   */
  async getRegistersWithStatus(restaurantId: string): Promise<any[]> {
    const registers = await this.registerRepository.find({
      where: { restaurantId },
      order: { created_at: 'ASC' } as any,
    });

    const registersWithStatus = await Promise.all(
      registers.map(async (reg) => {
        const activeSession = await this.sessionRepository.findOneBy({
          cashRegisterId: reg.id,
          status: CashSessionStatus.OPEN,
        });

        let currentBalance = 0;
        if (activeSession) {
          const movements = await this.movementRepository.findBy({
            cashSessionId: activeSession.id,
          });
          const netCashChange = movements.reduce((acc, mov) => {
            if (mov.paymentMethod !== PaymentMethod.CASH) return acc;
            if (mov.type === CashMovementType.OUT)
              return acc - Number(mov.amount);
            return acc + Number(mov.amount);
          }, 0);
          currentBalance = Number(activeSession.openingBalance) + netCashChange;
        }

        return {
          ...reg,
          status: activeSession ? 'open' : 'closed',
          activeSession: activeSession
            ? {
                id: activeSession.id,
                openedAt: activeSession.openedAt,
                openedBy: activeSession.openedBy,
                openingBalance: activeSession.openingBalance,
                currentBalance,
              }
            : null,
        };
      }),
    );

    return registersWithStatus;
  }

  /**
   * Tüm açık kasa oturumlarını getirir (restoran genelinde).
   */
  async getAllActiveSessions(restaurantId: string): Promise<any[]> {
    const registers = await this.registerRepository.find({
      where: { restaurantId, active: true },
    });

    const activeSessions: any[] = [];
    for (const reg of registers) {
      const session = await this.sessionRepository.findOne({
        where: { cashRegisterId: reg.id, status: CashSessionStatus.OPEN },
        relations: ['openedBy', 'movements'],
      });

      if (session) {
        const movements = await this.movementRepository.findBy({
          cashSessionId: session.id,
        });
        const netCashChange = movements.reduce((acc, mov) => {
          if (mov.paymentMethod !== PaymentMethod.CASH) return acc;
          if (mov.type === CashMovementType.OUT)
            return acc - Number(mov.amount);
          return acc + Number(mov.amount);
        }, 0);

        activeSessions.push({
          register: reg,
          session,
          currentBalance: Number(session.openingBalance) + netCashChange,
          netCashChange,
        });
      }
    }

    return activeSessions;
  }
}
