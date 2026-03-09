import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type ActiveOrderRow = {
  table_id: string;
  order_id: string;
  order_number: string | null;
  total_amount: string | number;
  created_at: string;
};

@Injectable()
export class OrderTableReadRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findActiveByRestaurant(
    restaurantId: string,
  ): Promise<ActiveOrderRow[]> {
    return this.dataSource.query(
      `
      SELECT o.table_id, o.id AS order_id, o.order_number, o.total_amount, o.created_at
      FROM business.orders o
      WHERE o.restaurant_id = $1
        AND o.table_id IS NOT NULL
        AND o.status IN ('pending', 'preparing', 'ready', 'served')
      ORDER BY o.created_at DESC
      `,
      [restaurantId],
    );
  }
}
