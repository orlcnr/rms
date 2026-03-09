import { Table } from '../entities/table.entity';
import { TableMapper, TableActiveOrderProjection } from './table.mapper';
import { TableResponseDto } from '../dto/table-response.dto';
import { ActiveOrderRow } from '../repositories/order-table-read.repository';
import { TableReservationRow } from '../repositories/reservation-table-read.repository';

export class TableBoardMapper {
  static map(params: {
    tables: Table[];
    activeOrders: ActiveOrderRow[];
    reservations: TableReservationRow[];
  }): TableResponseDto[] {
    const activeOrderMap = new Map<string, TableActiveOrderProjection>();
    for (const row of params.activeOrders) {
      if (!activeOrderMap.has(row.table_id)) {
        activeOrderMap.set(row.table_id, {
          id: row.order_id,
          order_number: row.order_number,
          total_price: Number(row.total_amount) || 0,
          created_at: row.created_at,
        });
      }
    }

    const reservationsMap = new Map<string, TableReservationRow[]>();
    for (const row of params.reservations) {
      const existing = reservationsMap.get(row.table_id) || [];
      existing.push(row);
      reservationsMap.set(row.table_id, existing);
    }

    return params.tables.map((table) =>
      TableMapper.toResponse({
        table,
        activeOrder: activeOrderMap.get(table.id) || null,
        reservations: (reservationsMap.get(table.id) || []).map((r) => ({
          id: r.id,
          table_id: r.table_id,
          reservation_time: r.reservation_time,
          status: r.status,
        })),
      }),
    );
  }
}
