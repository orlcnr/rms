import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';

@Injectable()
export class DeleteReservationUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(reservationId: string, restaurantId: string): Promise<Reservation> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id: reservationId, restaurant_id: restaurantId },
      });

      if (!reservation) {
        throw new NotFoundException(`Reservation ${reservationId} not found`);
      }

      reservation.status = ReservationStatus.CANCELLED;
      const cancelled = await manager.save(Reservation, reservation);
      await manager.softRemove(Reservation, cancelled);

      return cancelled;
    });
  }
}
