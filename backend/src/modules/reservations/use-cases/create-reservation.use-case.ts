import { ConflictException, Injectable } from '@nestjs/common';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { Reservation } from '../entities/reservation.entity';
import { ReservationRepository } from '../repositories/reservation.repository';
import { CustomersService } from '../../customers/customers.service';
import { SettingsService } from '../../settings/settings.service';

const RESERVATION_SLOT_MINUTES_KEY = 'reservation_slot_minutes';
const RESERVATION_SLOT_MINUTES_DEFAULT = 120;

@Injectable()
export class CreateReservationUseCase {
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
    dto: CreateReservationDto,
    restaurantId: string,
  ): Promise<Reservation> {
    await this.customersService.findOne(dto.customer_id, restaurantId);

    const slotMinutes = await this.resolveSlotMinutes(restaurantId);
    const startTime = new Date(dto.reservation_time);
    const endTime = new Date(startTime.getTime() + slotMinutes * 60 * 1000);

    const overlapping = await this.reservationRepository.findConflict({
      restaurantId,
      tableId: dto.table_id,
      startTime,
      endTime,
      slotMinutes,
    });

    if (overlapping) {
      throw new ConflictException(
        'Selected table is already booked for this time slot.',
      );
    }

    const entity = this.reservationRepository.create({
      ...dto,
      reservation_time: startTime,
      restaurant_id: restaurantId,
    });

    return this.reservationRepository.save(entity);
  }
}
