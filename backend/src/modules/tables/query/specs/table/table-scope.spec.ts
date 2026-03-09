import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Table } from '../../../entities/table.entity';

export class TableScopeSpec implements QuerySpec<Table> {
  constructor(private readonly restaurantId: string) {}

  apply(qb: SelectQueryBuilder<Table>): void {
    qb.andWhere('table.restaurant_id = :restaurantId', {
      restaurantId: this.restaurantId,
    });
  }
}
