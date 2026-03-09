import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderType } from '../enums/order-type.enum';

export class UpdateOrderItemDto {
  @ApiProperty({ example: 'uuid-of-menu-item' })
  @IsUUID()
  @IsNotEmpty()
  menu_item_id: string;

  @ApiProperty({ example: 2, description: 'Set quantity to 0 to remove item' })
  @IsNumber()
  @Min(0)
  quantity: number;
}

export class UpdateOrderItemsDto {
  @ApiProperty({ type: [UpdateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  items: UpdateOrderItemDto[];

  @ApiProperty({ example: 'Extra spicy', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ enum: OrderType, required: false })
  @IsEnum(OrderType)
  @IsOptional()
  type?: OrderType;

  @ApiProperty({ example: 'uuid-of-customer', required: false })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @ApiProperty({ example: '123 Street, City', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'uuid-v4-transaction-id', required: false })
  @IsString()
  @IsOptional()
  transaction_id?: string;
}
