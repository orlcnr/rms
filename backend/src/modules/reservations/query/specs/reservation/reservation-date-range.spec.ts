import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Reservation } from '../../../entities/reservation.entity';

export class ReservationDateRangeSpec implements QuerySpec<Reservation> {
  constructor(
    private readonly startDate: string,
    private readonly endDate: string,
  ) {}

  apply(qb: SelectQueryBuilder<Reservation>): void {
    qb.andWhere(
      `CAST(reservation.reservation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul' AS DATE) BETWEEN :startDate AND :endDate`,
      {
        startDate: this.startDate,
        endDate: this.endDate,
      },
    );
  }
}
