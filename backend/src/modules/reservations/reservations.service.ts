import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CustomersService } from '../customers/customers.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../audit/utils/sanitize-audit.util';

interface FindAllQuery {
  date?: string;
  startDate?: string;
  endDate?: string;
}

type ReservationActor = {
  id?: string;
  first_name?: string;
  last_name?: string;
  restaurantId?: string;
};

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly customersService: CustomersService,
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
    createReservationDto: CreateReservationDto,
    user: { restaurantId: string } & ReservationActor,
    request?: Request,
  ): Promise<Reservation> {
    try {
      const { customer_id, table_id, reservation_time } = createReservationDto;

      // Validate customer belongs to this restaurant
      await this.customersService.findOne(customer_id, user.restaurantId);

      const startTime = new Date(reservation_time);
      // Assume 2 hours duration for collision check
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      // Query with multi-tenant filtering
      const queryBuilder = this.reservationRepository
        .createQueryBuilder('reservation')
        .where('reservation.table_id = :tableId', { tableId: table_id })
        .andWhere('reservation.restaurant_id = :restaurantId', {
          restaurantId: user.restaurantId,
        })
        .andWhere('reservation.status IN (:...statuses)', {
          statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        })
        .andWhere(
          "(reservation.reservation_time < :endTime AND (reservation.reservation_time + interval '2 hours') > :startTime)",
          { startTime, endTime },
        );

      const overlapping = await queryBuilder.getOne();

      if (overlapping) {
        throw new ConflictException(
          'Selected table is already booked for this time slot.',
        );
      }

      const reservation = this.reservationRepository.create({
        ...createReservationDto,
        reservation_time: startTime, // Ensure Date object
        restaurant_id: user.restaurantId, // Multi-tenant: set restaurant_id
      });

      const savedReservation =
        await this.reservationRepository.save(reservation);
      await this.emitDomainAudit({
        action: AuditAction.RESERVATION_CREATED,
        restaurantId: user.restaurantId,
        payload: { reservationId: savedReservation.id },
        changes: sanitizeAuditChanges({
          after: {
            id: savedReservation.id,
            customer_id: savedReservation.customer_id,
            table_id: savedReservation.table_id,
            status: savedReservation.status,
            reservation_time: savedReservation.reservation_time,
          },
        }),
        actor: user,
        request,
        context: 'ReservationsService.create',
      });
      return savedReservation;
    } catch (error) {
      console.error('Reservation Create Error:', error);
      // Throw a general NestJS error to inform the client something failed on the server
      throw new BadRequestException(
        'Rezervasyon kaydedilirken bir sunucu hatası oluştu.',
      );
    }
  }

  async findAll(
    query: FindAllQuery,
    restaurantId?: string,
  ): Promise<Reservation[]> {
    const { date, startDate, endDate } = query;

    const qb = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.customer', 'customer')
      .leftJoinAndSelect('reservation.table', 'table')
      .orderBy('reservation.reservation_time', 'ASC');

    // Multi-tenant: Always filter by restaurant
    if (restaurantId) {
      qb.andWhere('reservation.restaurant_id = :restaurantId', {
        restaurantId,
      });
    }

    if (date) {
      // Convert UTC to Istanbul local time before comparing the date part
      qb.andWhere(
        "CAST(reservation.reservation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul' AS DATE) = :date",
        {
          date:
            date.toLowerCase() === 'today'
              ? new Intl.DateTimeFormat('en-CA', {
                  timeZone: 'Europe/Istanbul',
                }).format(new Date())
              : date,
        },
      );
    } else if (startDate && endDate) {
      // Convert UTC to Istanbul local time for range checks
      qb.andWhere(
        "CAST(reservation.reservation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul' AS DATE) BETWEEN :startDate AND :endDate",
        {
          startDate,
          endDate,
        },
      );
    }

    return qb.getMany();
  }

  async update(
    id: string,
    updateReservationDto: UpdateReservationDto,
    user: { restaurantId: string } & ReservationActor,
    request?: Request,
  ): Promise<Reservation> {
    // Find with multi-tenant check
    const reservation = await this.reservationRepository.findOne({
      where: { id, restaurant_id: user.restaurantId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }
    const beforeSnapshot = {
      customer_id: reservation.customer_id,
      table_id: reservation.table_id,
      status: reservation.status,
      reservation_time: reservation.reservation_time,
      notes: reservation.notes,
    };

    // Validate new customer belongs to this restaurant if provided
    if (updateReservationDto.customer_id) {
      await this.customersService.findOne(
        updateReservationDto.customer_id,
        user.restaurantId,
      );
    }

    // Should we re-check conflicts? Only if table or time changed
    if (
      updateReservationDto.table_id ||
      updateReservationDto.reservation_time
    ) {
      const tableId = updateReservationDto.table_id || reservation.table_id;
      const timeStr = updateReservationDto.reservation_time
        ? new Date(updateReservationDto.reservation_time)
        : reservation.reservation_time;
      const startTime = new Date(timeStr);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const overlapping = await this.reservationRepository
        .createQueryBuilder('reservation')
        .where('reservation.table_id = :tableId', { tableId })
        .andWhere('reservation.id != :id', { id }) // Exclude self
        .andWhere('reservation.restaurant_id = :restaurantId', {
          restaurantId: user.restaurantId,
        })
        .andWhere('reservation.status IN (:...statuses)', {
          statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        })
        .andWhere(
          "(reservation.reservation_time < :endTime AND (reservation.reservation_time + interval '2 hours') > :startTime)",
          { startTime, endTime },
        )
        .getOne();

      if (overlapping) {
        throw new ConflictException(
          'Selected table is already booked for this time slot.',
        );
      }
    }

    Object.assign(reservation, updateReservationDto);
    const savedReservation = await this.reservationRepository.save(reservation);
    await this.emitDomainAudit({
      action: AuditAction.RESERVATION_UPDATED,
      restaurantId: user.restaurantId,
      payload: { reservationId: savedReservation.id },
      changes: sanitizeAuditChanges({
        before: beforeSnapshot,
        after: {
          customer_id: savedReservation.customer_id,
          table_id: savedReservation.table_id,
          status: savedReservation.status,
          reservation_time: savedReservation.reservation_time,
          notes: savedReservation.notes,
        },
      }),
      actor: user,
      request,
      context: 'ReservationsService.update',
    });
    return savedReservation;
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
    user: { restaurantId: string } & ReservationActor,
    request?: Request,
  ): Promise<Reservation> {
    // Find with multi-tenant check
    const reservation = await this.reservationRepository.findOne({
      where: { id, restaurant_id: user.restaurantId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }
    const beforeSnapshot = {
      status: reservation.status,
    };

    reservation.status = status;
    const savedReservation = await this.reservationRepository.save(reservation);
    await this.emitDomainAudit({
      action: AuditAction.RESERVATION_STATUS_UPDATED,
      restaurantId: user.restaurantId,
      payload: { reservationId: savedReservation.id },
      changes: sanitizeAuditChanges({
        before: beforeSnapshot,
        after: { status: savedReservation.status },
      }),
      actor: user,
      request,
      context: 'ReservationsService.updateStatus',
    });
    return savedReservation;
  }
}
