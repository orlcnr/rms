import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsUUID,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export class GetMenuItemsDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  // Stock Status: 'all', 'in_stock', 'out_of_stock', 'critical'
  @ApiPropertyOptional({
    enum: ['all', 'in_stock', 'out_of_stock', 'critical'],
    default: 'all',
  })
  @IsEnum(['all', 'in_stock', 'out_of_stock', 'critical'])
  @IsOptional()
  stockStatus?: 'all' | 'in_stock' | 'out_of_stock' | 'critical' = 'all';

  // Sales Status: 'all', 'active', 'inactive'
  @ApiPropertyOptional({ enum: ['all', 'active', 'inactive'], default: 'all' })
  @IsEnum(['all', 'active', 'inactive'])
  @IsOptional()
  salesStatus?: 'all' | 'active' | 'inactive' = 'all';

  // Price Range
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  maxPrice?: number;

  // POS Mode: When true, automatically filters based on track_inventory setting
  // - track_inventory=true products: only show if stock > 0
  // - track_inventory=false products: show if is_available=true
  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  posMode?: boolean = false;
}
