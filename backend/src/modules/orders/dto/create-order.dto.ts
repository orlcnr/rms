import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { OrderType } from '../enums/order-type.enum';
import { OrderSource } from '../enums/order-source.enum';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateOrderItemDto {
  @ApiProperty({ example: 'uuid-of-menu-item' })
  @IsUUID()
  @IsNotEmpty()
  menu_item_id: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'uuid-of-restaurant' })
  @IsUUID()
  @IsNotEmpty()
  restaurant_id: string;

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
  integration_metadata?: any;
}
