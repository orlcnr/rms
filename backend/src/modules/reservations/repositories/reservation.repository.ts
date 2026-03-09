import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';

@Injectable()
export class ReservationRepository {
  constructor(
    @InjectRepository(Reservation)
    private readonly repository: Repository<Reservation>,
  ) {}

  createBaseListQuery(): SelectQueryBuilder<Reservation> {
    return this.repository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.customer', 'customer')
      .leftJoinAndSelect('reservation.table', 'table');
  }

  findOneInRestaurant(
    reservationId: string,
    restaurantId: string,
  ): Promise<Reservation | null> {
    return this.repository.findOne({
      where: { id: reservationId, restaurant_id: restaurantId },
      relations: ['customer', 'table'],
    });
  }

  create(entity: Partial<Reservation>): Reservation {
    return this.repository.create(entity);
  }

  save(entity: Reservation): Promise<Reservation> {
    return this.repository.save(entity);
  }

  softRemove(entity: Reservation): Promise<Reservation> {
    return this.repository.softRemove(entity);
  }

  async findConflict(params: {
    restaurantId: string;
    tableId: string;
    startTime: Date;
    endTime: Date;
    slotMinutes: number;
    excludeId?: string;
  }): Promise<Reservation | null> {
    const qb = this.repository
      .createQueryBuilder('reservation')
      .where('reservation.restaurant_id = :restaurantId', {
        restaurantId: params.restaurantId,
      })
      .andWhere('reservation.table_id = :tableId', { tableId: params.tableId })
      .andWhere('reservation.status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
      })
      .andWhere(
        `(reservation.reservation_time < :endTime
          AND (reservation.reservation_time + (:slotInterval)::interval) > :startTime)`,
        {
          startTime: params.startTime,
          endTime: params.endTime,
          slotInterval: `${params.slotMinutes} minutes`,
        },
      );

    if (params.excludeId) {
      qb.andWhere('reservation.id != :excludeId', { excludeId: params.excludeId });
    }

    return qb.getOne();
  }

  get raw(): Repository<Reservation> {
    return this.repository;
  }
}
