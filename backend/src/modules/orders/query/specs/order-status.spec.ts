import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { Order } from '../../entities/order.entity';

export class OrderStatusSpec implements QuerySpec<Order> {
  constructor(private readonly statusCsv: string) {}

  apply(query: SelectQueryBuilder<Order>): void {
    const statuses = this.statusCsv
      .split(',')
      .map((status) => status.trim())
      .filter(Boolean);

    if (!statuses.length) return;

    query.andWhere('order.status IN (:...statuses)', { statuses });
  }
}
