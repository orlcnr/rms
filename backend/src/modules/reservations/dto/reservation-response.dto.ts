import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '../entities/reservation.entity';

export class ReservationCustomerDto {
  /** @source business.customers.id */
  @ApiProperty()
  id: string;

  /** @source business.customers.first_name */
  @ApiProperty()
  first_name: string;

  /** @source business.customers.last_name */
  @ApiProperty()
  last_name: string;

  /** @source business.customers.phone */
  @ApiPropertyOptional({ nullable: true })
  phone?: string | null;
}

export class ReservationTableDto {
  /** @source business.tables.id */
  @ApiProperty()
  id: string;

  /** @source business.tables.name */
  @ApiProperty()
  name: string;
}

export class ReservationResponseDto {
  /** @source business.reservations.id */
  @ApiProperty()
  id: string;

  /** @source business.reservations.restaurant_id */
  @ApiProperty()
  restaurant_id: string;

  /** @source business.reservations.customer_id */
  @ApiProperty()
  customer_id: string;

  /** @source business.reservations.table_id */
  @ApiProperty()
  table_id: string;

  /** @source business.reservations.reservation_time */
  @ApiProperty()
  reservation_time: string;

  /** @source business.reservations.guest_count */
  @ApiProperty()
  guest_count: number;

  /** @source business.reservations.prepayment_amount */
  @ApiProperty()
  prepayment_amount: number;

  /** @source business.reservations.status */
  @ApiProperty({ enum: ReservationStatus })
  status: ReservationStatus;

  /** @source business.reservations.notes @nullable true */
  @ApiPropertyOptional({ nullable: true })
  notes?: string | null;

  /** @source business.reservations.created_at */
  @ApiProperty()
  created_at: string;

  /** @source business.reservations.updated_at */
  @ApiProperty()
  updated_at: string;

  /** @context customer relation projection @nullable true */
  @ApiPropertyOptional({ type: ReservationCustomerDto, nullable: true })
  customer?: ReservationCustomerDto | null;

  /** @context table relation projection @nullable true */
  @ApiPropertyOptional({ type: ReservationTableDto, nullable: true })
  table?: ReservationTableDto | null;
}

export class ReservationListResponseDto {
  /** @context paginated list */
  @ApiProperty({ type: [ReservationResponseDto] })
  items: ReservationResponseDto[];
}
