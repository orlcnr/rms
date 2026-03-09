import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { QueryRunner } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCashMovementDto } from '../dto/cash-ops.dto';
import { CashMovement } from '../entities/cash-movement.entity';
import { CashSession } from '../entities/cash-session.entity';
import { CashMovementType, CashSessionStatus } from '../enums/cash.enum';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';

type AuditActor = {
  id?: string;
  first_name?: string;
  last_name?: string;
};

@Injectable()
export class AddCashMovementUseCase {
  constructor(
    @InjectRepository(CashMovement)
    private readonly movementRepository: Repository<CashMovement>,
    @InjectRepository(CashSession)
    private readonly sessionRepository: Repository<CashSession>,
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
    dto: CreateCashMovementDto,
    queryRunner?: QueryRunner,
    actor?: AuditActor,
    request?: Request,
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

    const savedMovement = await repository.save(movement);

    if (!queryRunner) {
      await this.emitDomainAudit({
        action: AuditAction.CASH_MOVEMENT_ADDED,
        restaurantId: session.restaurantId,
        payload: {
          sessionId,
          movementId: savedMovement.id,
          type: savedMovement.type,
          amount: Number(savedMovement.amount),
        },
        changes: sanitizeAuditChanges({
          after: {
            id: savedMovement.id,
            type: savedMovement.type,
            amount: Number(savedMovement.amount),
            paymentMethod: savedMovement.paymentMethod,
            cashSessionId: savedMovement.cashSessionId,
          },
        }),
        actor: actor || { id: userId },
        request,
        context: 'AddCashMovementUseCase.execute',
      });
    }

    return savedMovement;
  }
}
