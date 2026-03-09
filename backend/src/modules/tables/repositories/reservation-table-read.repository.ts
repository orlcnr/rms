import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type TableReservationRow = {
  id: string;
  table_id: string;
  reservation_time: string;
  status: string;
};

@Injectable()
export class ReservationTableReadRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findTodayActiveByRestaurant(
    restaurantId: string,
    startOfToday: Date,
  ): Promise<TableReservationRow[]> {
    return this.dataSource.query(
      `
      SELECT r.id, r.table_id, r.reservation_time, r.status
      FROM business.reservations r
      WHERE r.restaurant_id = $1
        AND r.reservation_time >= $2
        AND r.status IN ('pending', 'confirmed')
      ORDER BY r.reservation_time ASC
      `,
      [restaurantId, startOfToday.toISOString()],
    );
  }
}
