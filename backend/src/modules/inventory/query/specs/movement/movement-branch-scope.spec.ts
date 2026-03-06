import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { StockMovement } from '../../../entities/stock-movement.entity';

export class MovementBranchScopeSpec implements QuerySpec<StockMovement> {
  constructor(private readonly branchId: string) {}

  apply(qb: SelectQueryBuilder<StockMovement>): SelectQueryBuilder<StockMovement> {
    return qb.where('movement.branch_id = :branchId', { branchId: this.branchId });
  }
}
