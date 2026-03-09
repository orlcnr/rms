import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Payment } from '../../../entities/payment.entity';

export class PaymentSearchSpec implements QuerySpec<Payment> {
  constructor(private readonly search: string) {}

  apply(qb: SelectQueryBuilder<Payment>): void {
    qb.andWhere(
      '(CAST(order.orderNumber AS TEXT) ILIKE :search OR payment.transaction_id ILIKE :search OR table.name ILIKE :search)',
      { search: `%${this.search}%` },
    );
  }
}
