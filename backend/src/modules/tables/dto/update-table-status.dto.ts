import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TableStatus } from '../entities/table.entity';

export class UpdateTableStatusDto {
  @ApiProperty({ enum: [TableStatus.AVAILABLE, TableStatus.OUT_OF_SERVICE] })
  @IsEnum(TableStatus)
  status: TableStatus;
}
