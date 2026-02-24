import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) { }

  async create(
    createReservationDto: CreateReservationDto,
  ): Promise<Reservation> {
    const { table_id, reservation_time } = createReservationDto;
    const startTime = new Date(reservation_time);
    // Assume 2 hours duration for collision check
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    // Let's use Query Builder for precise time overlap check
    const overlapping = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.table_id = :tableId', { tableId: table_id })
      .andWhere('reservation.status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
      })
      .andWhere(
        "(reservation.reservation_time < :endTime AND (reservation.reservation_time + interval '2 hours') > :startTime)",
        { startTime, endTime },
      )
      .getOne();

    if (overlapping) {
      throw new ConflictException(
        'Selected table is already booked for this time slot.',
      );
    }

    const reservation = this.reservationRepository.create({
      ...createReservationDto,
      reservation_time: startTime, // Ensure Date object
    });

    return this.reservationRepository.save(reservation);
  }

  async findAll(
    date?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Reservation[]> {
    const query = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.customer', 'customer')
      .leftJoinAndSelect('reservation.table', 'table')
      .orderBy('reservation.reservation_time', 'ASC');

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query.andWhere('reservation.reservation_time BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      });
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.andWhere('reservation.reservation_time BETWEEN :start AND :end', {
        start,
        end,
      });
    }

    return query.getMany();
  }

  async update(
    id: string,
    updateReservationDto: UpdateReservationDto,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
    });
    if (!reservation)
      throw new NotFoundException(`Reservation ${id} not found`);

    // Should we re-check conflicts? Only if table or time changed
    if (
      updateReservationDto.table_id ||
      updateReservationDto.reservation_time
    ) {
      const tableId = updateReservationDto.table_id || reservation.table_id;
      const timeStr = updateReservationDto.reservation_time
        ? new Date(updateReservationDto.reservation_time)
        : reservation.reservation_time;
      const startTime = new Date(timeStr);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const overlapping = await this.reservationRepository
        .createQueryBuilder('reservation')
        .where('reservation.table_id = :tableId', { tableId })
        .andWhere('reservation.id != :id', { id }) // Exclude self
        .andWhere('reservation.status IN (:...statuses)', {
          statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        })
        .andWhere(
          "(reservation.reservation_time < :endTime AND (reservation.reservation_time + interval '2 hours') > :startTime)",
          { startTime, endTime },
        )
        .getOne();

      if (overlapping) {
        throw new ConflictException(
          'Selected table is already booked for this time slot.',
        );
      }
    }

    Object.assign(reservation, updateReservationDto);
    return this.reservationRepository.save(reservation);
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
    });
    if (!reservation)
      throw new NotFoundException(`Reservation ${id} not found`);

    reservation.status = status;
    return this.reservationRepository.save(reservation);
  }
}
