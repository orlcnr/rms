import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TableStatus } from '../entities/table.entity';

export class GetTablesDto {
  @ApiPropertyOptional({ example: 'VIP' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'uuid-of-area' })
  @IsOptional()
  @IsUUID()
  area_id?: string;

  @ApiPropertyOptional({ enum: [TableStatus.OUT_OF_SERVICE] })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;
}
