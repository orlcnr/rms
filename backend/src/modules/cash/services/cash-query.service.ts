import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashSession } from '../entities/cash-session.entity';
import { CashMovement } from '../entities/cash-movement.entity';
import { CashRegister } from '../entities/cash-register.entity';
import { PaymentMethod } from '../../payments/entities/payment.entity';
import {
  CashMovementSubtype,
  CashMovementType,
  CashSessionStatus,
} from '../enums/cash.enum';
import { GetSessionHistoryDto } from '../dto/get-session-history.dto';
import { SessionHistoryQueryFactory } from '../query/factories/session-history-query.factory';
import { CashSummaryDto } from '../dto/cash-summary.dto';
import { ReconciliationReportDto } from '../dto/reconciliation-report.dto';
import { SettingsService } from '../../settings/settings.service';
import { CashReconciliationSnapshotRepository } from '../repositories/cash-reconciliation-snapshot.repository';
import { getNow } from '../../../common/utils/date.utils';
import { CashRegisterRepository } from '../repositories/cash-register.repository';
import { CashMovementRepository } from '../repositories/cash-movement.repository';

@Injectable()
export class CashQueryService {
  private readonly logger = new Logger(CashQueryService.name);

  constructor(
    @InjectRepository(CashRegister)
    private readonly registerRepository: Repository<CashRegister>,
    @InjectRepository(CashSession)
    private readonly sessionRepository: Repository<CashSession>,
    @InjectRepository(CashMovement)
    private readonly movementRepository: Repository<CashMovement>,
    private readonly settingsService: SettingsService,
    private readonly reconciliationSnapshotRepository: CashReconciliationSnapshotRepository,
    private readonly cashRegisterRepository: CashRegisterRepository,
    private readonly cashMovementRepository: CashMovementRepository,
    private readonly sessionHistoryQueryFactory: SessionHistoryQueryFactory,
  ) {}

  async getActiveRegister(restaurantId: string): Promise<CashRegister> {
    const register =
      await this.cashRegisterRepository.findActiveByRestaurant(restaurantId);

    if (!register) {
      throw new NotFoundException('Aktif kasa bulunamadı');
    }

    return register;
  }

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

      if (!activeSession) {
        result.push({
          ...reg,
          status: 'closed',
          activeSession: null,
        });
        continue;
      }

      const netCashChange = activeSession.movements.reduce((acc, mov) => {
        if (mov.paymentMethod !== PaymentMethod.CASH) return acc;
        if (mov.type === CashMovementType.OUT) return acc - Number(mov.amount);
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
          currentBalance: Number(activeSession.openingBalance) + netCashChange,
        },
      });
    }

    return result;
  }

  async getSessionHistory(
    restaurantId: string,
    filters: GetSessionHistoryDto,
  ): Promise<{
    items: CashSession[];
    meta: {
      totalItems: number;
      itemCount: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
    };
  }> {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.cashRegister', 'register')
      .leftJoinAndSelect('session.openedBy', 'openedBy')
      .leftJoinAndSelect('session.closedBy', 'closedBy')
      .orderBy('session.openedAt', 'DESC');

    const specs = this.sessionHistoryQueryFactory.create(filters, {
      restaurantId,
    });
    for (const spec of specs) {
      spec.apply(queryBuilder);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return {
      items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async getMovements(sessionId: string): Promise<CashMovement[]> {
    return this.cashMovementRepository.findBySessionIdOrdered(sessionId);
  }

  async getSessions(registerId: string): Promise<CashSession[]> {
    return this.sessionRepository.find({
      where: { cashRegisterId: registerId },
      order: { openedAt: 'DESC' },
      relations: ['openedBy', 'closedBy'],
    });
  }

  async getSessionById(sessionId: string): Promise<CashSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['movements', 'cashRegister', 'openedBy', 'closedBy'],
    });

    if (!session) {
      throw new NotFoundException('Kasa oturumu bulunamadı');
    }

    return session;
  }

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
        session,
        currentBalance: Number(session.openingBalance) + netCashChange,
        netCashChange,
      });
    }

    return result;
  }

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
          summary.netTip += amount;
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

  async getReconciliationReport(
    restaurantId: string,
    sessionId: string,
  ): Promise<ReconciliationReportDto> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, cashRegister: { restaurantId } },
      relations: ['cashRegister'],
    });

    if (!session) {
      throw new NotFoundException('Kasa oturumu bulunamadı');
    }

    if (session.status === CashSessionStatus.CLOSED) {
      const snapshot =
        await this.reconciliationSnapshotRepository.findBySessionId(sessionId);
      if (snapshot?.report) {
        const snapshotReport = snapshot.report as unknown as ReconciliationReportDto;
        return {
          ...snapshotReport,
          refundSummary: snapshotReport.refundSummary ?? {
            totalRefunded: 0,
            refundCount: 0,
            byMethod: {
              cash: 0,
              card: 0,
              openAccount: 0,
              mealVoucher: 0,
            },
            netCash: 0,
          },
          is_live: false,
        };
      }
    }

    const sessionWithDetails = await this.sessionRepository.findOne({
      where: { id: sessionId, cashRegister: { restaurantId } },
      relations: ['openedBy', 'closedBy', 'cashRegister', 'movements'],
    });

    if (!sessionWithDetails) {
      throw new NotFoundException('Kasa oturumu bulunamadı');
    }

    const isLive = sessionWithDetails.status !== CashSessionStatus.CLOSED;
    const report = await this.buildReconciliationReportDto(
      sessionWithDetails,
      restaurantId,
      isLive,
    );

    if (!isLive) {
      await this.persistReconciliationSnapshotBestEffort({
        sessionId,
        restaurantId,
        report,
        computedAt: getNow(),
      });
    }

    return report;
  }

  private async buildReconciliationReportDto(
    session: CashSession,
    restaurantId: string,
    isLive: boolean,
  ): Promise<ReconciliationReportDto> {
    const tipCommissionRate = await this.settingsService.getSetting(
      restaurantId,
      'tip_commission_rate',
      0,
    );

    const report = new ReconciliationReportDto();
    report.is_live = isLive;
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
        if (movement.isVoid) {
          voidedSales += Math.abs(amount);
        } else {
          totalGrossSales += amount;
          salesByMethod[movement.paymentMethod] =
            (salesByMethod[movement.paymentMethod] || 0) + amount;
        }
      }

      if (movement.type === CashMovementType.IN && movement.isTip) {
        totalTip += amount;
        if (movement.paymentMethod !== PaymentMethod.CASH) {
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

    let netBankTotal = 0;
    for (const [method, amount] of Object.entries(salesByMethod)) {
      if (method !== String(PaymentMethod.CASH)) {
        netBankTotal += amount;
      }
    }
    report.netBankAmount = netBankTotal;

    const refundMovements = session.movements.filter(
      (movement) =>
        movement.subtype === CashMovementSubtype.REFUND &&
        movement.type === CashMovementType.OUT,
    );

    const byMethod = {
      cash: 0,
      card: 0,
      openAccount: 0,
      mealVoucher: 0,
    };

    for (const movement of refundMovements) {
      const amount = Math.abs(Number(movement.amount) || 0);
      switch (movement.paymentMethod) {
        case PaymentMethod.CASH:
          byMethod.cash += amount;
          break;
        case PaymentMethod.OPEN_ACCOUNT:
          byMethod.openAccount += amount;
          break;
        case PaymentMethod.MEAL_VOUCHER:
          byMethod.mealVoucher += amount;
          break;
        default:
          byMethod.card += amount;
          break;
      }
    }

    const cashInTotal = session.movements
      .filter((movement) => movement.paymentMethod === PaymentMethod.CASH)
      .filter((movement) => movement.type === CashMovementType.IN)
      .reduce((sum, movement) => sum + Number(movement.amount), 0);
    const cashOutTotal = session.movements
      .filter((movement) => movement.paymentMethod === PaymentMethod.CASH)
      .filter((movement) => movement.type === CashMovementType.OUT)
      .reduce((sum, movement) => sum + Number(movement.amount), 0);

    report.refundSummary = {
      totalRefunded: byMethod.cash + byMethod.card + byMethod.openAccount + byMethod.mealVoucher,
      refundCount: refundMovements.length,
      byMethod,
      netCash: cashInTotal - cashOutTotal,
    };

    return report;
  }

  private async persistReconciliationSnapshotBestEffort(payload: {
    sessionId: string;
    restaurantId: string;
    report: ReconciliationReportDto;
    computedAt: Date;
  }): Promise<void> {
    try {
      const result =
        await this.reconciliationSnapshotRepository.insertIfNotExists({
          sessionId: payload.sessionId,
          restaurantId: payload.restaurantId,
          report: payload.report as unknown as Record<string, unknown>,
          computedAt: payload.computedAt,
        });

      if (!result.inserted) {
        this.logger.warn(
          JSON.stringify({
            event: 'reconciliation.snapshot_exists',
            sessionId: payload.sessionId,
          }),
        );
      }
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'reconciliation.snapshot_persist_failed',
          sessionId: payload.sessionId,
          message: error instanceof Error ? error.message : 'unknown_error',
        }),
      );
    }
  }
}
