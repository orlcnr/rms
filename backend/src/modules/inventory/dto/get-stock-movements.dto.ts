import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '../entities/stock-movement.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class GetStockMovementsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Malzeme adı (ILIKE)' })
  @IsOptional()
  @IsString()
  ingredientName?: string;

  @ApiPropertyOptional({
    enum: MovementType,
    description: 'Hareket tipi filtresi (IN/OUT/ADJUST)',
  })
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    description: 'Başlangıç tarihi (YYYY-MM-DD)',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    description: 'Bitiş tarihi (YYYY-MM-DD)',
    example: '2026-03-06',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}
