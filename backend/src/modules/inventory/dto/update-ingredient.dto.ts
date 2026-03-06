import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { CreateIngredientDto } from './create-ingredient.dto';

export class UpdateIngredientDto extends PartialType(CreateIngredientDto) {
  @ApiPropertyOptional({ example: 120.5, description: 'Son alış fiyatı' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  last_price?: number;

  @ApiPropertyOptional({ example: 95.25, description: 'Ortalama maliyet' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  average_cost?: number;

  @ApiPropertyOptional({ example: 110.0, description: 'Önceki fiyat' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  previous_price?: number;

  @ApiPropertyOptional({
    example: '2026-03-05T11:30:00.000Z',
    description: 'Fiyat güncelleme zamanı',
  })
  @IsDateString()
  @IsOptional()
  price_updated_at?: string;
}
