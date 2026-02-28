import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: 'uuid-of-customer' })
  @IsUUID()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({ example: 'uuid-of-table' })
  @IsUUID()
  @IsNotEmpty()
  table_id: string;

  @ApiProperty({ example: '2023-12-25T19:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  reservation_time: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  guest_count: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  prepayment_amount?: number;

  @ApiPropertyOptional({ example: 'Anniversary' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'uuid-v4-transaction-id' })
  @IsString()
  @IsOptional()
  transaction_id?: string;
}
