import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { Order } from '../../entities/order.entity';

export class OrderWaiterSpec implements QuerySpec<Order> {
  constructor(private readonly waiterId: string) {}

  apply(query: SelectQueryBuilder<Order>): void {
    query.andWhere('order.user_id = :waiterId', { waiterId: this.waiterId });
  }
}
