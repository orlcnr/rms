import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableStatus } from '../entities/table.entity';
import { Type } from 'class-transformer';

export class CreateTableDto {
  @ApiProperty({ example: 'Table 5' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ example: 'uuid-of-area' })
  @IsString()
  @IsUUID()
  @IsOptional()
  area_id?: string;

  @ApiPropertyOptional({
    enum: [TableStatus.AVAILABLE, TableStatus.OUT_OF_SERVICE],
  })
  @IsEnum(TableStatus, { message: 'Geçersiz masa durumu' })
  @IsOptional()
  status?: TableStatus;
}
