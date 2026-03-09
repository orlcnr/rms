import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Payment } from '../../../entities/payment.entity';

export class PaymentOrderSpec implements QuerySpec<Payment> {
  constructor(private readonly orderId: string) {}

  apply(qb: SelectQueryBuilder<Payment>): void {
    qb.andWhere('payment.order_id = :orderId', { orderId: this.orderId });
  }
}
