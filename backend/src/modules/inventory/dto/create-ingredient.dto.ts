import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  unit: string; // kg, gr, adet, lt, vb.

  @IsNumber()
  @Min(0)
  @IsOptional()
  critical_level?: number;

  @IsString()
  @IsNotEmpty()
  restaurant_id: string;
}
