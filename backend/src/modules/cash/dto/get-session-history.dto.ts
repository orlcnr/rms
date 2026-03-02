import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CashSessionStatus } from '../enums/cash.enum';

export class GetSessionHistoryDto {
  @ApiPropertyOptional({ description: 'Başlangıç tarihi (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Bitiş tarihi (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Kasa ID filtresi' })
  @IsOptional()
  @IsUUID()
  registerId?: string;

  @ApiPropertyOptional({
    enum: CashSessionStatus,
    description: 'Oturum durumu filtresi',
  })
  @IsOptional()
  @IsEnum(CashSessionStatus)
  status?: CashSessionStatus;

  @ApiPropertyOptional({ description: 'Açan kullanıcı ID filtresi' })
  @IsOptional()
  @IsUUID()
  openedById?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
