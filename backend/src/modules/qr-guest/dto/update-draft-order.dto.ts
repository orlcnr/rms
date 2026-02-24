import { IsOptional, IsArray, ValidateNested, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { DraftOrderItemDto } from './create-draft-order.dto';

export class UpdateDraftOrderDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftOrderItemDto)
  items?: DraftOrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Order notes cannot exceed 1000 characters' })
  notes?: string;
}
