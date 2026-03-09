import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ReservationStatus } from '../entities/reservation.entity';

export class GetReservationsDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'today' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: '2026-03-08' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-03-09' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ReservationStatus })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  table_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customer_id?: string;
}
