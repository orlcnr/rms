import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Payment } from '../../../entities/payment.entity';

export class PaymentDateRangeSpec implements QuerySpec<Payment> {
  constructor(
    private readonly startDate: string,
    private readonly endDate: string,
  ) {}

  apply(qb: SelectQueryBuilder<Payment>): void {
    qb.andWhere('payment.created_at::date BETWEEN :startDate AND :endDate', {
      startDate: this.startDate,
      endDate: this.endDate,
    });
  }
}
