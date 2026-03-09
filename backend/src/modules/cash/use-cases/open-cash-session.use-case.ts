import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { QueryFailedError } from 'typeorm';
import { OpenCashSessionDto } from '../dto/cash-ops.dto';
import { CashSession } from '../entities/cash-session.entity';
import { CashRegister } from '../entities/cash-register.entity';
import { CashMovement } from '../entities/cash-movement.entity';
import { CashMovementType, CashSessionStatus } from '../enums/cash.enum';
import { PaymentMethod } from '../../payments/entities/payment.entity';
import { DataSource } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';

type AuditActor = {
  id?: string;
  first_name?: string;
  last_name?: string;
};

@Injectable()
export class OpenCashSessionUseCase {
  private readonly logger = new Logger(OpenCashSessionUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
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
    restaurantId: string,
    userId: string,
    dto: OpenCashSessionDto,
    actor?: AuditActor,
    request?: Request,
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

      const existingSession = await sessionRepository.findOneBy({
        cashRegisterId: register.id,
        status: CashSessionStatus.OPEN,
      });

      if (existingSession) {
        throw new BadRequestException('Bu kasada zaten açık bir oturum var');
      }

      const session = sessionRepository.create({
        cashRegisterId: register.id,
        restaurantId,
        openedById: userId,
        openingBalance: dto.openingBalance,
        status: CashSessionStatus.OPEN,
      });

      const savedSession = await sessionRepository.save(session);

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
      await this.emitDomainAudit({
        action: AuditAction.CASH_SESSION_OPENED,
        restaurantId,
        payload: {
          sessionId: savedSession.id,
          registerId: savedSession.cashRegisterId,
          openingBalance: Number(savedSession.openingBalance),
        },
        changes: sanitizeAuditChanges({
          after: {
            id: savedSession.id,
            status: savedSession.status,
            openingBalance: Number(savedSession.openingBalance),
            cashRegisterId: savedSession.cashRegisterId,
          },
        }),
        actor: actor || { id: userId },
        request,
        context: 'OpenCashSessionUseCase.execute',
      });
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
}
