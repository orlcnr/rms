import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { Order } from '../../entities/order.entity';

export class OrderTypeSpec implements QuerySpec<Order> {
  constructor(private readonly typeCsv: string) {}

  apply(query: SelectQueryBuilder<Order>): void {
    const types = this.typeCsv
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean);

    if (!types.length) return;

    query.andWhere('order.type IN (:...types)', { types });
  }
}
