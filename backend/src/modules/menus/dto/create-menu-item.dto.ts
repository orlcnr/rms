import {
  IsBoolean,
  IsDecimal,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RecipeItemDto {
  @IsUUID()
  @IsNotEmpty()
  ingredient_id: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;
}

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Cheeseburger' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'With cheddar and pickles' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ example: 'http://example.com/burger.jpg' })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  is_available?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  track_inventory?: boolean;

  @ApiPropertyOptional({ type: [RecipeItemDto] })
  @IsOptional()
  recipes?: RecipeItemDto[];

  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  @IsNotEmpty()
  category_id: string;

  /**
   * Toplam ürün maliyeti (recipes'ten otomatik hesaplanabilir veya manuel girilebilir)
   * Food cost hesaplaması için kullanılır
   */
  @ApiPropertyOptional({ example: 45.5, description: 'Toplam reçete maliyeti' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  total_cost?: number;
}
