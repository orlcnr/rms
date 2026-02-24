import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  product_id: string; // MenuItem ID

  @IsString()
  @IsNotEmpty()
  ingredient_id: string;

  @IsNumber()
  @Min(0.001)
  @IsNotEmpty()
  quantity: number;
}
