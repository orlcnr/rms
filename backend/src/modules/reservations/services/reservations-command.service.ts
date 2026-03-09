import { Injectable } from '@nestjs/common';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { ReservationStatus } from '../entities/reservation.entity';
import { ReservationMapper } from '../mappers/reservation.mapper';
import { ReservationResponseDto } from '../dto/reservation-response.dto';
import { CreateReservationUseCase } from '../use-cases/create-reservation.use-case';
import { UpdateReservationUseCase } from '../use-cases/update-reservation.use-case';
import { ChangeReservationStatusUseCase } from '../use-cases/change-reservation-status.use-case';
import { DeleteReservationUseCase } from '../use-cases/delete-reservation.use-case';

@Injectable()
export class ReservationsCommandService {
  constructor(
    private readonly createReservationUseCase: CreateReservationUseCase,
    private readonly updateReservationUseCase: UpdateReservationUseCase,
    private readonly changeReservationStatusUseCase: ChangeReservationStatusUseCase,
    private readonly deleteReservationUseCase: DeleteReservationUseCase,
  ) {}

  async create(
    dto: CreateReservationDto,
    restaurantId: string,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.createReservationUseCase.execute(
      dto,
      restaurantId,
    );
    return ReservationMapper.toResponse(reservation);
  }

  async update(
    id: string,
    dto: UpdateReservationDto,
    restaurantId: string,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.updateReservationUseCase.execute(
      id,
      dto,
      restaurantId,
    );
    return ReservationMapper.toResponse(reservation);
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
    restaurantId: string,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.changeReservationStatusUseCase.execute(
      id,
      status,
      restaurantId,
    );
    return ReservationMapper.toResponse(reservation);
  }

  async delete(id: string, restaurantId: string): Promise<void> {
    await this.deleteReservationUseCase.execute(id, restaurantId);
  }
}
