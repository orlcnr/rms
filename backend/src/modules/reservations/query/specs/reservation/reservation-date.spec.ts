import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Reservation } from '../../../entities/reservation.entity';

export class ReservationDateSpec implements QuerySpec<Reservation> {
  constructor(private readonly date: string) {}

  apply(qb: SelectQueryBuilder<Reservation>): void {
    qb.andWhere(
      `CAST(reservation.reservation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul' AS DATE) = :date`,
      {
        date: this.date,
      },
    );
  }
}
