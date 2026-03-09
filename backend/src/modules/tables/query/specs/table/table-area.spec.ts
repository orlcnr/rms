import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Table } from '../../../entities/table.entity';

export class TableAreaSpec implements QuerySpec<Table> {
  constructor(private readonly areaId: string) {}

  apply(qb: SelectQueryBuilder<Table>): void {
    qb.andWhere('table.area_id = :areaId', { areaId: this.areaId });
  }
}
