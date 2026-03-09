import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Reservation } from '../../../entities/reservation.entity';

export class ReservationTableSpec implements QuerySpec<Reservation> {
  constructor(private readonly tableId: string) {}

  apply(qb: SelectQueryBuilder<Reservation>): void {
    qb.andWhere('reservation.table_id = :tableId', { tableId: this.tableId });
  }
}
