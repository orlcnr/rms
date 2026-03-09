import { Injectable, NotFoundException } from '@nestjs/common';
import { paginate } from 'nestjs-typeorm-paginate';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { ReservationMapper } from '../mappers/reservation.mapper';
import { ReservationResponseDto } from '../dto/reservation-response.dto';
import { ReservationRepository } from '../repositories/reservation.repository';
import { GetReservationsDto } from '../dto/get-reservations.dto';
import { ReservationQueryFactory } from '../query/factories/reservation-query.factory';

@Injectable()
export class ReservationsQueryService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly reservationQueryFactory: ReservationQueryFactory,
  ) {}

  private resolveDate(date?: string): string | undefined {
    if (!date) {
      return undefined;
    }

    if (date.toLowerCase() === 'today') {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
      }).format(new Date());
    }

    return date;
  }

  async findAll(restaurantId: string, filters: GetReservationsDto): Promise<{
    items: ReservationResponseDto[];
    meta: PaginationMetaDto;
  }> {
    const qb = this.reservationRepository.createBaseListQuery();
    const specs = this.reservationQueryFactory.create(
      {
        ...filters,
        date: this.resolveDate(filters.date),
      },
      { restaurantId },
    );

    for (const spec of specs) {
      spec.apply(qb);
    }

    qb.orderBy('reservation.reservation_time', 'ASC');

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const paginated = await paginate(qb, { page, limit });

    return {
      items: paginated.items.map((item) => ReservationMapper.toResponse(item)),
      meta: new PaginationMetaDto({
        page,
        limit,
        itemCount: paginated.meta.itemCount ?? 0,
        totalItems: paginated.meta.totalItems ?? 0,
        totalPages: paginated.meta.totalPages ?? 0,
        hasPreviousPage: page > 1,
        hasNextPage: page < (paginated.meta.totalPages ?? 0),
      }),
    };
  }

  async findOne(id: string, restaurantId: string): Promise<ReservationResponseDto> {
    const reservation = await this.reservationRepository.findOneInRestaurant(
      id,
      restaurantId,
    );

    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    return ReservationMapper.toResponse(reservation);
  }
}
