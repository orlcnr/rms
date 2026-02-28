import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkStockUpdateItemDto {
  @ApiProperty()
  @IsString()
  ingredientId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  newQuantity: number;
}

export class BulkStockUpdateDto {
  @ApiProperty({ type: [BulkStockUpdateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkStockUpdateItemDto)
  updates: BulkStockUpdateItemDto[];

  @ApiPropertyOptional({ example: 'uuid-v4-transaction-id' })
  @IsString()
  @IsOptional()
  transaction_id?: string;
}
