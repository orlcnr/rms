import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Reservation } from '../../../entities/reservation.entity';

export class ReservationCustomerSpec implements QuerySpec<Reservation> {
  constructor(private readonly customerId: string) {}

  apply(qb: SelectQueryBuilder<Reservation>): void {
    qb.andWhere('reservation.customer_id = :customerId', {
      customerId: this.customerId,
    });
  }
}
