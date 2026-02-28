import { IsArray, IsEnum, IsUUID, ArrayNotEmpty } from 'class-validator';
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
}
