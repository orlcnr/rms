import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { Reservation } from '../entities/reservation.entity';
import { ReservationRepository } from '../repositories/reservation.repository';
import { CustomersService } from '../../customers/customers.service';
import { SettingsService } from '../../settings/settings.service';

const RESERVATION_SLOT_MINUTES_KEY = 'reservation_slot_minutes';
const RESERVATION_SLOT_MINUTES_DEFAULT = 120;

@Injectable()
export class UpdateReservationUseCase {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly customersService: CustomersService,
    private readonly settingsService: SettingsService,
  ) {}

  private async resolveSlotMinutes(restaurantId: string): Promise<number> {
    const value = await this.settingsService.getSetting<number | string>(
      restaurantId,
      RESERVATION_SLOT_MINUTES_KEY,
      RESERVATION_SLOT_MINUTES_DEFAULT,
    );

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return RESERVATION_SLOT_MINUTES_DEFAULT;
    }

    return parsed;
  }

  async execute(
    reservationId: string,
    dto: UpdateReservationDto,
    restaurantId: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOneInRestaurant(
      reservationId,
      restaurantId,
    );

    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    if (dto.status !== undefined) {
      throw new BadRequestException(
        'Use /reservations/:id/status endpoint for status transitions.',
      );
    }

    if (dto.customer_id) {
      await this.customersService.findOne(dto.customer_id, restaurantId);
    }

    const tableChanged = dto.table_id !== undefined && dto.table_id !== reservation.table_id;
    const timeChanged =
      dto.reservation_time !== undefined &&
      new Date(dto.reservation_time).getTime() !==
        new Date(reservation.reservation_time).getTime();

    if (tableChanged || timeChanged) {
      const slotMinutes = await this.resolveSlotMinutes(restaurantId);
      const targetTableId = dto.table_id ?? reservation.table_id;
      const targetStartTime = dto.reservation_time
        ? new Date(dto.reservation_time)
        : reservation.reservation_time;
      const targetEndTime = new Date(
        targetStartTime.getTime() + slotMinutes * 60 * 1000,
      );

      const overlapping = await this.reservationRepository.findConflict({
        restaurantId,
        tableId: targetTableId,
        startTime: targetStartTime,
        endTime: targetEndTime,
        slotMinutes,
        excludeId: reservation.id,
      });

      if (overlapping) {
        throw new ConflictException(
          'Selected table is already booked for this time slot.',
        );
      }
    }

    Object.assign(reservation, dto);
    if (dto.reservation_time) {
      reservation.reservation_time = new Date(dto.reservation_time);
    }

    return this.reservationRepository.save(reservation);
  }
}
