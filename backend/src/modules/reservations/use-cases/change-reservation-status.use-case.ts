import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { ReservationRepository } from '../repositories/reservation.repository';

const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  [ReservationStatus.PENDING]: [
    ReservationStatus.CONFIRMED,
    ReservationStatus.CANCELLED,
    ReservationStatus.NO_SHOW,
    ReservationStatus.ARRIVED,
  ],
  [ReservationStatus.CONFIRMED]: [
    ReservationStatus.COMPLETED,
    ReservationStatus.CANCELLED,
    ReservationStatus.NO_SHOW,
    ReservationStatus.ARRIVED,
  ],
  [ReservationStatus.ARRIVED]: [
    ReservationStatus.COMPLETED,
    ReservationStatus.CANCELLED,
  ],
  [ReservationStatus.COMPLETED]: [],
  [ReservationStatus.CANCELLED]: [],
  [ReservationStatus.NO_SHOW]: [],
};

@Injectable()
export class ChangeReservationStatusUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  async execute(
    reservationId: string,
    status: ReservationStatus,
    restaurantId: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOneInRestaurant(
      reservationId,
      restaurantId,
    );

    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    if (reservation.status === status) {
      return reservation;
    }

    const allowedStatuses = ALLOWED_TRANSITIONS[reservation.status] ?? [];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition: ${reservation.status} -> ${status}`,
      );
    }

    reservation.status = status;
    return this.reservationRepository.save(reservation);
  }
}
