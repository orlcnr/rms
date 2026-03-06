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
  @IsOptional()
  @IsNumber()
  @Min(0)
  critical_level?: number;

  @ApiPropertyOptional({ example: 6, description: 'paket/koli için çarpan' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pack_size?: number;

  @ApiPropertyOptional({ example: 'uuid-v4-transaction-id' })
  @IsOptional()
  @IsString()
  transaction_id?: string;
}
