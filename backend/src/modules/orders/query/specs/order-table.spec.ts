import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { Order } from '../../entities/order.entity';

export class OrderTableSpec implements QuerySpec<Order> {
  constructor(private readonly tableId: string) {}

  apply(query: SelectQueryBuilder<Order>): void {
    query.andWhere('order.table_id = :tableId', { tableId: this.tableId });
  }
}
