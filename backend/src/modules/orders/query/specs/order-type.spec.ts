import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { Order } from '../../entities/order.entity';
import { OrderType } from '../../enums/order-type.enum';

export class OrderTypeSpec implements QuerySpec<Order> {
  constructor(private readonly typeCsv: string) {}

  apply(query: SelectQueryBuilder<Order>): void {
    const requestedTypes = this.typeCsv
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean);

    if (!requestedTypes.length) return;

    const expandedTypes = new Set<string>(requestedTypes);

    // Transition alias support:
    // - counter queries should include legacy takeaway rows
    // - takeaway queries should include counter rows
    if (expandedTypes.has(OrderType.COUNTER)) {
      expandedTypes.add(OrderType.TAKEAWAY);
    }
    if (expandedTypes.has(OrderType.TAKEAWAY)) {
      expandedTypes.add(OrderType.COUNTER);
    }

    query.andWhere('"order"."type"::text IN (:...types)', {
      types: Array.from(expandedTypes),
    });
  }
}
