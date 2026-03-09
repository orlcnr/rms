import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Table } from '../../../entities/table.entity';

export class TableSearchSpec implements QuerySpec<Table> {
  constructor(private readonly search: string) {}

  apply(qb: SelectQueryBuilder<Table>): void {
    qb.andWhere('(table.name ILIKE :search OR area.name ILIKE :search)', {
      search: `%${this.search}%`,
    });
  }
}
