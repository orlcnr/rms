import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BranchOverrideBulkOperation {
  SET_PRICE = 'set_price',
  INCREASE_AMOUNT = 'increase_amount',
  DECREASE_AMOUNT = 'decrease_amount',
  INCREASE_PERCENT = 'increase_percent',
  DECREASE_PERCENT = 'decrease_percent',
  HIDE = 'hide',
  UNHIDE = 'unhide',
  CLEAR_OVERRIDE = 'clear_override',
}

export class BulkBranchMenuOverridesDto {
  @ApiProperty({ type: [String], description: 'Menu item UUID list' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  itemIds: string[];

  @ApiProperty({ enum: BranchOverrideBulkOperation })
  @IsEnum(BranchOverrideBulkOperation)
  operation: BranchOverrideBulkOperation;

  @ApiPropertyOptional({
    description:
      'Required for price operations. Forbidden for hide/unhide/clear_override.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  value?: number;
}

export interface BulkBranchMenuOverridesResult {
  affectedCount: number;
  failedIds: string[];
  errorsById?: Record<string, string>;
}
