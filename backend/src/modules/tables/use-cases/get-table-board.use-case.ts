import { Injectable } from '@nestjs/common';
import { endOfDay, startOfDay } from 'date-fns';
import { TableRepository } from '../repositories/table.repository';
import { OrderTableReadRepository } from '../repositories/order-table-read.repository';
import { ReservationTableReadRepository } from '../repositories/reservation-table-read.repository';
import { TableBoardMapper } from '../mappers/table-board.mapper';
import { GetTablesDto } from '../dto/get-tables.dto';
import { TableQueryFactory } from '../query/factories/table-query.factory';
import { TableResponseDto } from '../dto/table-response.dto';
import { TableStatus } from '../entities/table.entity';

@Injectable()
export class GetTableBoardUseCase {
  constructor(
    private readonly tableRepository: TableRepository,
    private readonly orderTableReadRepository: OrderTableReadRepository,
    private readonly reservationTableReadRepository: ReservationTableReadRepository,
    private readonly tableQueryFactory: TableQueryFactory,
  ) {}

  async execute(
    restaurantId: string,
    filters: GetTablesDto,
  ): Promise<TableResponseDto[]> {
    const qb = this.tableRepository.createBaseQuery(restaurantId);
    const specs = this.tableQueryFactory.create(filters, { restaurantId });
    for (const spec of specs) {
      spec.apply(qb);
    }

    qb.orderBy('table.name', 'ASC');
    const tables = await qb.getMany();

    const dayStart = startOfDay(new Date());
    const dayEnd = endOfDay(new Date());

    const [activeOrders, reservations] = await Promise.all([
      this.orderTableReadRepository.findActiveByRestaurant(restaurantId),
      this.reservationTableReadRepository
        .findTodayActiveByRestaurant(restaurantId, dayStart)
        .then((rows) =>
          rows.filter((row) => new Date(row.reservation_time) <= dayEnd),
        ),
    ]);

    const mapped = TableBoardMapper.map({
      tables,
      activeOrders,
      reservations,
    });

    if (filters.status && filters.status !== TableStatus.OUT_OF_SERVICE) {
      return mapped.filter((table) => table.status === filters.status);
    }

    return mapped;
  }
}
