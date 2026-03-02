import {
  IsArray,
  IsEnum,
  IsUUID,
  ArrayNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';

export class BatchUpdateStatusDto {
  @ApiProperty({ type: [String], example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  order_ids: string[];

  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({
    required: false,
    example: '2b652227-6b89-4c2d-8877-fcca5f1509af',
  })
  @IsString()
  @IsOptional()
  transaction_id?: string;
}
