import { Table, TableStatus } from '../entities/table.entity';
import {
  TableActiveOrderDto,
  TableReservationPreviewDto,
  TableResponseDto,
} from '../dto/table-response.dto';

export type TableActiveOrderProjection = {
  id: string;
  order_number: string | null;
  total_price: number;
  created_at: string;
};

export class TableMapper {
  static toResponse(input: {
    table: Table;
    activeOrder?: TableActiveOrderProjection | null;
    reservations?: TableReservationPreviewDto[];
  }): TableResponseDto {
    const { table, activeOrder, reservations } = input;

    const status =
      table.status === TableStatus.OUT_OF_SERVICE
        ? TableStatus.OUT_OF_SERVICE
        : activeOrder
          ? TableStatus.OCCUPIED
          : TableStatus.AVAILABLE;

    return {
      id: table.id,
      name: table.name,
      capacity: Number(table.capacity),
      status,
      qr_code_url: table.qr_code_url,
      restaurant_id: table.restaurant_id,
      area_id: table.area_id,
      area: table.area
        ? {
            id: table.area.id,
            name: table.area.name,
          }
        : null,
      active_order: activeOrder
        ? ({
            id: activeOrder.id,
            order_number: activeOrder.order_number,
            total_price: activeOrder.total_price,
            created_at: activeOrder.created_at,
          } as TableActiveOrderDto)
        : null,
      reservations: reservations || [],
    };
  }
}
