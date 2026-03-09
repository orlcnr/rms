import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Payment, PaymentStatus } from '../../../entities/payment.entity';

export class PaymentStatusSpec implements QuerySpec<Payment> {
  constructor(private readonly status: PaymentStatus) {}

  apply(qb: SelectQueryBuilder<Payment>): void {
    qb.andWhere('payment.status = :status', { status: this.status });
  }
}
