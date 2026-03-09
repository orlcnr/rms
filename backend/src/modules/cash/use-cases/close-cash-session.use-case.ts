import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import type { QueryRunner } from 'typeorm';
import { DataSource, Repository } from 'typeorm';
import { CloseCashSessionDto } from '../dto/cash-ops.dto';
import { CashSession } from '../entities/cash-session.entity';
import { CashMovement } from '../entities/cash-movement.entity';
import {
  CashMovementSubtype,
  CashMovementType,
  CashSessionStatus,
} from '../enums/cash.enum';
import { PaymentMethod } from '../../payments/entities/payment.entity';
import { TablesService } from '../../tables/tables.service';
import { SettingsService } from '../../settings/settings.service';
import { getNow } from '../../../common/utils/date.utils';
import { ReconciliationReportDto } from '../dto/reconciliation-report.dto';
import { CashReconciliationSnapshotRepository } from '../repositories/cash-reconciliation-snapshot.repository';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';

type AuditActor = {
  id?: string;
  first_name?: string;
  last_name?: string;
};

@Injectable()
export class CloseCashSessionUseCase {
  private readonly logger = new Logger(CloseCashSessionUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CashSession)
    private readonly sessionRepository: Repository<CashSession>,
    @InjectRepository(CashMovement)
    private readonly movementRepository: Repository<CashMovement>,
    private readonly tablesService: TablesService,
    private readonly settingsService: SettingsService,
    private readonly reconciliationSnapshotRepository: CashReconciliationSnapshotRepository,
    private readonly auditService: AuditService,
  ) {}

  private buildActorName(actor?: AuditActor): string | undefined {
    if (!actor?.first_name) {
      return undefined;
    }
    return `${actor.first_name} ${actor.last_name || ''}`.trim();
  }

  private async emitDomainAudit(params: {
    action: AuditAction;
    restaurantId?: string;
    payload?: Record<string, unknown>;
    changes?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      meta?: Record<string, unknown>;
    };
    actor?: AuditActor;
    request?: Request;
    context: string;
  }): Promise<void> {
    const headerUserAgent = params.request?.headers?.['user-agent'];
    const userAgent =
      typeof headerUserAgent === 'string'
        ? headerUserAgent
        : headerUserAgent?.[0];

    await this.auditService.safeEmitLog(
      {
        action: params.action,
        resource: 'CASH',
        user_id: params.actor?.id,
        user_name: this.buildActorName(params.actor),
        restaurant_id: params.restaurantId,
        payload: params.payload,
        changes: params.changes,
        ip_address: params.request?.ip,
        user_agent: userAgent,
      },
      params.context,
    );
    this.auditService.markRequestAsAudited(
      params.request as unknown as Record<string, unknown>,
    );
  }

  async execute(
    userId: string,
    sessionId: string,
    dto: CloseCashSessionDto,
    queryRunner?: QueryRunner,
    actor?: AuditActor,
    request?: Request,
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
      const beforeSnapshot = {
        id: session.id,
        status: session.status,
        closingBalance: Number(session.closingBalance || 0),
        countedBalance: Number(session.countedBalance || 0),
      };

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

      const snapshotSession = await sessionRepository.findOne({
        where: { id: savedSession.id },
        relations: ['openedBy', 'closedBy', 'cashRegister', 'movements'],
      });

      if (snapshotSession) {
        const snapshotReport = await this.buildReconciliationReportDto(
          snapshotSession,
          sessionRestaurantId,
          false,
        );
        const snapshotInsertResult =
          await this.reconciliationSnapshotRepository.insertIfNotExists(
            {
              sessionId: savedSession.id,
              restaurantId: sessionRestaurantId,
              report: snapshotReport as unknown as Record<string, unknown>,
              computedAt: getNow(),
            },
            activeQueryRunner.manager,
          );

        if (!snapshotInsertResult.inserted) {
          this.logger.warn(
            JSON.stringify({
              event: 'close_session.snapshot_exists',
              sessionId: savedSession.id,
              actorId: actor?.id || userId,
            }),
          );
        }
      }

      if (ownsTransaction) {
        await activeQueryRunner.commitTransaction();
      }

      if (ownsTransaction) {
        await this.emitDomainAudit({
          action: AuditAction.CASH_SESSION_CLOSED,
          restaurantId: sessionRestaurantId,
          payload: { sessionId: savedSession.id },
          changes: sanitizeAuditChanges({
            before: beforeSnapshot,
            after: {
              id: savedSession.id,
              status: savedSession.status,
              closingBalance: Number(savedSession.closingBalance || 0),
              countedBalance: Number(savedSession.countedBalance || 0),
              difference: Number(savedSession.difference || 0),
            },
          }),
          actor: actor || { id: userId },
          request,
          context: 'CloseCashSessionUseCase.execute',
        });
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

    return report;
  }
}
