import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ReservationStatus } from '../entities/reservation.entity';

export class UpdateReservationStatusDto {
  @ApiProperty({ enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  status: ReservationStatus;
}
