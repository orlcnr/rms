import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DraftOrderItemDto {
  @IsString()
  menuItemId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}

export class CreateDraftOrderDto {
  @IsOptional()
  @IsString()
  clientRequestId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftOrderItemDto)
  items: DraftOrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Order notes cannot exceed 1000 characters' })
  notes?: string;
}
