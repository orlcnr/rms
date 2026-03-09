import { Reservation } from '../entities/reservation.entity';
import { ReservationResponseDto } from '../dto/reservation-response.dto';

export class ReservationMapper {
  static toResponse(entity: Reservation): ReservationResponseDto {
    return {
      id: entity.id,
      restaurant_id: entity.restaurant_id,
      customer_id: entity.customer_id,
      table_id: entity.table_id,
      reservation_time: entity.reservation_time.toISOString(),
      guest_count: Number(entity.guest_count),
      prepayment_amount: Number(entity.prepayment_amount ?? 0),
      status: entity.status,
      notes: entity.notes ?? null,
      created_at: entity.created_at.toISOString(),
      updated_at: entity.updated_at.toISOString(),
      customer: entity.customer
        ? {
            id: entity.customer.id,
            first_name: entity.customer.first_name,
            last_name: entity.customer.last_name,
            phone: entity.customer.phone,
          }
        : null,
      table: entity.table
        ? {
            id: entity.table.id,
            name: entity.table.name,
          }
        : null,
    };
  }
}
