import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Payment } from '../../../entities/payment.entity';

export class PaymentScopeSpec implements QuerySpec<Payment> {
  constructor(private readonly restaurantId: string) {}

  apply(qb: SelectQueryBuilder<Payment>): void {
    qb.andWhere('payment.restaurant_id = :restaurantId', {
      restaurantId: this.restaurantId,
    });
  }
}
