import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIngredientDto {
  @ApiProperty({ example: 'Tomato' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @IsNotEmpty()
  unit: string; // kg, gr, adet, lt, vb.

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  critical_level?: number;

  @ApiProperty({ example: 'uuid-of-restaurant' })
  @IsString()
  @IsNotEmpty()
  restaurant_id: string;

  @ApiPropertyOptional({ example: 'uuid-v4-transaction-id' })
  @IsString()
  @IsOptional()
  transaction_id?: string;
}
