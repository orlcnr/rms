import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashRegister } from '../entities/cash-register.entity';
import { CashSession } from '../entities/cash-session.entity';
import { CreateCashRegisterDto } from '../dto/cash-ops.dto';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';
import { CashRegisterRepository } from '../repositories/cash-register.repository';
import { CashMovementRepository } from '../repositories/cash-movement.repository';

type AuditActor = {
  id?: string;
  first_name?: string;
  last_name?: string;
};

export type EnsureDefaultRegisterResult = {
  register: CashRegister;
  created: boolean;
};

@Injectable()
export class CashCommandService {
  constructor(
    @InjectRepository(CashSession)
    private readonly sessionRepository: Repository<CashSession>,
    private readonly cashRegisterRepository: CashRegisterRepository,
    private readonly cashMovementRepository: CashMovementRepository,
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

  async ensureDefaultRegister(
    restaurantId: string,
    actor?: AuditActor,
    request?: Request,
  ): Promise<EnsureDefaultRegisterResult> {
    let register = await this.cashRegisterRepository.findOneByName(
      restaurantId,
      'Genel Kasa',
    );
    let created = false;

    if (!register) {
      register = this.cashRegisterRepository.createWithDefaults({
        restaurantId,
        name: 'Genel Kasa',
        active: true,
      });
      register = await this.cashRegisterRepository.save(register);
      created = true;
    }

    if (created) {
      await this.emitDomainAudit({
        action: AuditAction.CASH_DEFAULT_REGISTER_ENSURED,
        restaurantId,
        payload: { registerId: register.id, name: register.name },
        changes: sanitizeAuditChanges({
          after: {
            id: register.id,
            name: register.name,
            active: register.active,
          },
        }),
        actor,
        request,
        context: 'CashCommandService.ensureDefaultRegister',
      });
    }

    return { register, created };
  }

  async createRegister(
    restaurantId: string,
    dto: CreateCashRegisterDto,
    actor?: AuditActor,
    request?: Request,
  ): Promise<CashRegister> {
    const existingRegister = await this.cashRegisterRepository.findOneByName(
      restaurantId,
      dto.name,
    );

    if (existingRegister) {
      throw new BadRequestException('Bu isimde bir kasa zaten mevcut.');
    }

    const register = this.cashRegisterRepository.createWithDefaults({
      ...dto,
      restaurantId,
    });
    const savedRegister = await this.cashRegisterRepository.save(register);
    await this.emitDomainAudit({
      action: AuditAction.CASH_REGISTER_CREATED,
      restaurantId,
      payload: { registerId: savedRegister.id, name: savedRegister.name },
      changes: sanitizeAuditChanges({
        after: {
          id: savedRegister.id,
          name: savedRegister.name,
          active: savedRegister.active,
        },
      }),
      actor,
      request,
      context: 'CashCommandService.createRegister',
    });
    return savedRegister;
  }

  async deleteMovementsBySession(sessionId: string): Promise<void> {
    await this.cashMovementRepository.deleteBySessionId(sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionRepository.delete({ id: sessionId });
  }

  async deleteRegister(
    registerId: string,
    actor?: AuditActor,
    request?: Request,
  ): Promise<void> {
    const register = await this.cashRegisterRepository.findById(registerId);
    if (!register) {
      throw new NotFoundException('Kasa bulunamadı');
    }
    await this.cashRegisterRepository.deleteById(registerId);
    await this.emitDomainAudit({
      action: AuditAction.CASH_REGISTER_DELETED,
      restaurantId: register.restaurantId,
      payload: { registerId },
      changes: sanitizeAuditChanges({
        before: {
          id: register.id,
          name: register.name,
          active: register.active,
        },
        after: { deleted: true },
      }),
      actor,
      request,
      context: 'CashCommandService.deleteRegister',
    });
  }
}
