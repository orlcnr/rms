import { IsString, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkStockUpdateItemDto {
  @IsString()
  ingredientId: string;

  @IsNumber()
  @Min(0)
  newQuantity: number;
}

export class BulkStockUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkStockUpdateItemDto)
  updates: BulkStockUpdateItemDto[];
}
