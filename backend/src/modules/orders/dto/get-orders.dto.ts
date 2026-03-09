import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

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
    example: 'dine_in,takeaway',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Masa ID', example: 'uuid-of-table' })
  @IsOptional()
  @IsUUID()
  tableId?: string;

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
