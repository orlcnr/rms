import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderType } from '../enums/order-type.enum';
import { OrderSource } from '../enums/order-source.enum';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PickupType } from '../enums/pickup-type.enum';
import { DeliveryStatus } from '../enums/delivery-status.enum';

class CreateOrderItemDto {
  @ApiProperty({ example: 'uuid-of-menu-item' })
  @IsUUID()
  @IsNotEmpty()
  menu_item_id: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'If omitted, backend defaults from menu_item.requires_kitchen. Dine-in always true in v2.',
  })
  @IsBoolean()
  @IsOptional()
  send_to_kitchen?: boolean;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ example: 'uuid-of-table' })
  @IsUUID()
  @IsOptional()
  table_id?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ example: 'No onions' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ enum: OrderType, default: OrderType.DINE_IN })
  @Transform(({ value }) =>
    value === OrderType.TAKEAWAY ? OrderType.COUNTER : value,
  )
  @IsEnum(OrderType)
  @IsOptional()
  type?: OrderType;

  @ApiPropertyOptional({ enum: OrderSource, default: OrderSource.INTERNAL })
  @IsEnum(OrderSource)
  @IsOptional()
  source?: OrderSource;

  @ApiPropertyOptional({ example: 'EXT-123' })
  @IsString()
  @IsOptional()
  external_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-customer' })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 5.0 })
  @IsNumber()
  @IsOptional()
  delivery_fee?: number;

  @ApiPropertyOptional({ example: { courier_id: '123' } })
  @IsOptional()
  integration_metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'uuid-v4-transaction-id' })
  @IsString()
  @IsOptional()
  transaction_id?: string;

  @ApiPropertyOptional({
    enum: PickupType,
    example: PickupType.IMMEDIATE,
    description: 'Only for counter orders',
  })
  @IsEnum(PickupType)
  @IsOptional()
  pickup_type?: PickupType;

  @ApiPropertyOptional({
    example: '2026-03-09T14:30:00.000Z',
    description: 'Required when type=counter and pickup_type=scheduled',
  })
  @IsDateString()
  @IsOptional()
  pickup_time?: string;

  @ApiPropertyOptional({
    enum: DeliveryStatus,
    example: DeliveryStatus.PENDING,
    description: 'Optional bootstrap value for delivery orders',
  })
  @IsEnum(DeliveryStatus)
  @IsOptional()
  delivery_status?: DeliveryStatus;

  @ApiPropertyOptional({
    example: 'Ataturk Cd. No:12 Kat:2 D:5',
    description: 'Required when type=delivery',
  })
  @IsString()
  @IsOptional()
  delivery_address?: string;

  @ApiPropertyOptional({
    example: '05321234567',
    description: 'Required when type=delivery',
  })
  @IsString()
  @IsOptional()
  delivery_phone?: string;

  @ApiPropertyOptional({
    example: 'Ahmet Kaya',
    description: 'Optional customer display name for counter/delivery',
  })
  @IsString()
  @IsOptional()
  customer_name?: string;
}
