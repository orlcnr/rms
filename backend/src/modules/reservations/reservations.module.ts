import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module';
import { Reservation } from './entities/reservation.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationRepository } from './repositories/reservation.repository';
import { ReservationQueryFactory } from './query/factories/reservation-query.factory';
import { ReservationsAuthorizationService } from './services/reservations-authorization.service';
import { ReservationsCommandService } from './services/reservations-command.service';
import { ReservationsQueryService } from './services/reservations-query.service';
import { ChangeReservationStatusUseCase } from './use-cases/change-reservation-status.use-case';
import { CreateReservationUseCase } from './use-cases/create-reservation.use-case';
import { DeleteReservationUseCase } from './use-cases/delete-reservation.use-case';
import { UpdateReservationUseCase } from './use-cases/update-reservation.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation]), CustomersModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationsQueryService,
    ReservationsCommandService,
    ReservationsAuthorizationService,
    ReservationRepository,
    ReservationQueryFactory,
    CreateReservationUseCase,
    UpdateReservationUseCase,
    ChangeReservationStatusUseCase,
    DeleteReservationUseCase,
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
