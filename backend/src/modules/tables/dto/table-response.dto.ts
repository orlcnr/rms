import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableStatus } from '../entities/table.entity';

export class TableActiveOrderDto {
  /** @source business.orders.id */
  @ApiProperty()
  id: string;

  /** @source business.orders.order_number @nullable true */
  @ApiPropertyOptional({ nullable: true })
  order_number?: string | null;

  /** @source business.orders.total_amount */
  @ApiProperty()
  total_price: number;

  /** @source business.orders.created_at */
  @ApiProperty()
  created_at: string;
}

export class TableReservationPreviewDto {
  /** @source business.reservations.id */
  @ApiProperty()
  id: string;

  /** @source business.reservations.table_id */
  @ApiProperty()
  table_id: string;

  /** @source business.reservations.reservation_time */
  @ApiProperty()
  reservation_time: string;

  /** @source business.reservations.status */
  @ApiProperty()
  status: string;
}

export class TableResponseDto {
  /** @source business.tables.id */
  @ApiProperty()
  id: string;

  /** @source business.tables.name */
  @ApiProperty()
  name: string;

  /** @source business.tables.capacity */
  @ApiProperty()
  capacity: number;

  /** @context read-model status (active order + out_of_service) */
  @ApiProperty({ enum: TableStatus })
  status: TableStatus;

  /** @source business.tables.qr_code_url @nullable true */
  @ApiPropertyOptional({ nullable: true })
  qr_code_url?: string | null;

  /** @source business.tables.restaurant_id */
  @ApiProperty()
  restaurant_id: string;

  /** @source business.tables.area_id @nullable true */
  @ApiPropertyOptional({ nullable: true })
  area_id?: string | null;

  /** @source business.areas.* @nullable true */
  @ApiPropertyOptional({ nullable: true })
  area?: { id: string; name: string } | null;

  /** @context active order projection @nullable true */
  @ApiPropertyOptional({ nullable: true, type: TableActiveOrderDto })
  active_order?: TableActiveOrderDto | null;

  /** @context today reservation preview */
  @ApiPropertyOptional({ type: [TableReservationPreviewDto] })
  reservations?: TableReservationPreviewDto[];
}
