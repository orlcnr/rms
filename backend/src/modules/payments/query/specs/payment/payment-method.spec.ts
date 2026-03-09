import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Payment, PaymentMethod } from '../../../entities/payment.entity';

export class PaymentMethodSpec implements QuerySpec<Payment> {
  constructor(private readonly method: PaymentMethod) {}

  apply(qb: SelectQueryBuilder<Payment>): void {
    qb.andWhere('payment.payment_method = :method', { method: this.method });
  }
}
