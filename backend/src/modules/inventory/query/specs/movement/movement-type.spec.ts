import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { StockMovement, MovementType } from '../../../entities/stock-movement.entity';

export class MovementTypeSpec implements QuerySpec<StockMovement> {
  constructor(private readonly type: MovementType) {}

  apply(qb: SelectQueryBuilder<StockMovement>): SelectQueryBuilder<StockMovement> {
    return qb.andWhere('movement.type = :type', { type: this.type });
  }
}
