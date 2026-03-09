import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Reservation } from '../../../entities/reservation.entity';

export class ReservationScopeSpec implements QuerySpec<Reservation> {
  constructor(private readonly restaurantId: string) {}

  apply(qb: SelectQueryBuilder<Reservation>): void {
    qb.andWhere('reservation.restaurant_id = :restaurantId', {
      restaurantId: this.restaurantId,
    });
  }
}
