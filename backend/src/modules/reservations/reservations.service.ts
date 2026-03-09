import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../audit/utils/sanitize-audit.util';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GetReservationsDto } from './dto/get-reservations.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationStatus } from './entities/reservation.entity';
import { ReservationsCommandService } from './services/reservations-command.service';
import { ReservationsQueryService } from './services/reservations-query.service';

export type ReservationActor = {
  id?: string;
  first_name?: string;
  last_name?: string;
  restaurantId?: string;
};

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationsQueryService: ReservationsQueryService,
    private readonly reservationsCommandService: ReservationsCommandService,
    private readonly auditService: AuditService,
  ) {}

  private buildActorName(actor?: ReservationActor): string | undefined {
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
    actor?: ReservationActor;
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
        resource: 'RESERVATIONS',
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

  async create(
    dto: CreateReservationDto,
    actor: ReservationActor,
    request?: Request,
  ): Promise<ReservationResponseDto> {
    const created = await this.reservationsCommandService.create(
      dto,
      actor.restaurantId as string,
    );

    await this.emitDomainAudit({
      action: AuditAction.RESERVATION_CREATED,
      restaurantId: actor.restaurantId,
      payload: { reservationId: created.id },
      changes: sanitizeAuditChanges({
        after: {
          id: created.id,
          customer_id: created.customer_id,
          table_id: created.table_id,
          status: created.status,
          reservation_time: created.reservation_time,
        },
      }),
      actor,
      request,
      context: 'ReservationsService.create',
    });

    return created;
  }

  findAll(filters: GetReservationsDto, restaurantId: string) {
    return this.reservationsQueryService.findAll(restaurantId, filters);
  }

  findOne(id: string, restaurantId: string): Promise<ReservationResponseDto> {
    return this.reservationsQueryService.findOne(id, restaurantId);
  }

  async update(
    id: string,
    dto: UpdateReservationDto,
    actor: ReservationActor,
    request?: Request,
  ): Promise<ReservationResponseDto> {
    const before = await this.reservationsQueryService.findOne(
      id,
      actor.restaurantId as string,
    );

    const updated = await this.reservationsCommandService.update(
      id,
      dto,
      actor.restaurantId as string,
    );

    await this.emitDomainAudit({
      action: AuditAction.RESERVATION_UPDATED,
      restaurantId: actor.restaurantId,
      payload: { reservationId: id },
      changes: sanitizeAuditChanges({
        before: {
          customer_id: before.customer_id,
          table_id: before.table_id,
          status: before.status,
          reservation_time: before.reservation_time,
          notes: before.notes,
        },
        after: {
          customer_id: updated.customer_id,
          table_id: updated.table_id,
          status: updated.status,
          reservation_time: updated.reservation_time,
          notes: updated.notes,
        },
      }),
      actor,
      request,
      context: 'ReservationsService.update',
    });

    return updated;
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
    actor: ReservationActor,
    request?: Request,
  ): Promise<ReservationResponseDto> {
    const before = await this.reservationsQueryService.findOne(
      id,
      actor.restaurantId as string,
    );

    const updated = await this.reservationsCommandService.updateStatus(
      id,
      status,
      actor.restaurantId as string,
    );

    await this.emitDomainAudit({
      action: AuditAction.RESERVATION_STATUS_UPDATED,
      restaurantId: actor.restaurantId,
      payload: { reservationId: id },
      changes: sanitizeAuditChanges({
        before: { status: before.status },
        after: { status: updated.status },
      }),
      actor,
      request,
      context: 'ReservationsService.updateStatus',
    });

    return updated;
  }

  async delete(
    id: string,
    actor: ReservationActor,
    request?: Request,
  ): Promise<void> {
    const before = await this.reservationsQueryService.findOne(
      id,
      actor.restaurantId as string,
    );

    await this.reservationsCommandService.delete(id, actor.restaurantId as string);

    await this.emitDomainAudit({
      action: AuditAction.RESERVATION_UPDATED,
      restaurantId: actor.restaurantId,
      payload: { reservationId: id },
      changes: sanitizeAuditChanges({
        before: {
          status: before.status,
          deleted_at: null,
        },
        after: {
          status: ReservationStatus.CANCELLED,
          deleted_at: 'soft_deleted',
        },
      }),
      actor,
      request,
      context: 'ReservationsService.delete',
    });
  }
}
