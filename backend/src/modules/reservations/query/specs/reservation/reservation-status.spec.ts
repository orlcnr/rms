import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Reservation, ReservationStatus } from '../../../entities/reservation.entity';

export class ReservationStatusSpec implements QuerySpec<Reservation> {
  constructor(private readonly status: ReservationStatus) {}

  apply(qb: SelectQueryBuilder<Reservation>): void {
    qb.andWhere('reservation.status = :status', { status: this.status });
  }
}
