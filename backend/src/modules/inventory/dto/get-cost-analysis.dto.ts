import { IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class GetCostAnalysisDto extends PaginationDto {
  @ApiPropertyOptional({
    default: 7,
    description: 'Fiyat değişimi için son N gün',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number = 7;
}

export class GetCountDifferencesDto extends PaginationDto {
  @ApiPropertyOptional({ default: 4, description: 'Son N hafta' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weeks?: number = 4;
}

export class GetFoodCostAlertsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Snapshot yerine anlık hesaplama yapıp güncel snapshot üretir',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  refresh?: boolean = false;
}

export class GetIngredientUsageDto {
  @ApiPropertyOptional({
    description: 'Malzeme ID (query param olarak da kullanılabilir)',
  })
  @IsOptional()
  ingredientId?: string;
}
