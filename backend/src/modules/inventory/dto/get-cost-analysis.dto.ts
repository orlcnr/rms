import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetCostAnalysisDto {
  @ApiPropertyOptional({ default: 7, description: 'Fiyat değişimi için son N gün' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number = 7;
}

export class GetCountDifferencesDto {
  @ApiPropertyOptional({ default: 4, description: 'Son N hafta' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weeks?: number = 4;
}

export class GetIngredientUsageDto {
  @ApiPropertyOptional({ description: 'Malzeme ID (query param olarak da kullanılabilir)' })
  @IsOptional()
  ingredientId?: string;
}
