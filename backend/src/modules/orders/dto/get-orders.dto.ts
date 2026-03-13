import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class GetOrdersDto {
  @ApiPropertyOptional({
    description: 'Sipariş durumları (csv)',
    example: 'pending,preparing',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Garson ID', example: 'uuid-of-user' })
  @IsOptional()
  @IsUUID()
  waiterId?: string;

  @ApiPropertyOptional({
    description: 'Sipariş tipleri (csv)',
    example: 'dine_in,counter',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Masa ID', example: 'uuid-of-table' })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional({
    description: 'Başlangıç tarihi (YYYY-MM-DD)',
    example: '2026-03-09',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Bitiş tarihi (YYYY-MM-DD)',
    example: '2026-03-09',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Sayfa', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Sayfa başı kayıt', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
