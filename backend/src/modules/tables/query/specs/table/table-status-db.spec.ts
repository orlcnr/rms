import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Table, TableStatus } from '../../../entities/table.entity';

export class TableStatusDbSpec implements QuerySpec<Table> {
  constructor(private readonly status: TableStatus) {}

  apply(qb: SelectQueryBuilder<Table>): void {
    if (this.status === TableStatus.OUT_OF_SERVICE) {
      qb.andWhere('table.status = :dbStatus', {
        dbStatus: TableStatus.OUT_OF_SERVICE,
      });
    }
  }
}
