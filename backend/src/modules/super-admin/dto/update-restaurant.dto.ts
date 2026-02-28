import { PartialType } from '@nestjs/mapped-types';
import { CreateSA_RestaurantDto } from './create-restaurant.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSA_RestaurantDto extends PartialType(
  CreateSA_RestaurantDto,
) {
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
