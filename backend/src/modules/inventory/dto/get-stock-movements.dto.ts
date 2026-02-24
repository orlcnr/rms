import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsDate,
  IsEnum,
} from 'class-validator';
import { MovementType } from '../entities/stock-movement.entity'; // Import MovementType
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class GetStockMovementsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  ingredientName?: string;

  @IsOptional()
  @IsEnum(MovementType) // Add IsEnum validator
  type?: MovementType; // New filt    er property

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  endDate?: Date;
}
