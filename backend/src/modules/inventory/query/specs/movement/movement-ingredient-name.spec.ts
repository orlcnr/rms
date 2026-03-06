import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { StockMovement } from '../../../entities/stock-movement.entity';

export class MovementIngredientNameSpec implements QuerySpec<StockMovement> {
  constructor(private readonly ingredientName: string) {}

  apply(qb: SelectQueryBuilder<StockMovement>): SelectQueryBuilder<StockMovement> {
    return qb.andWhere('ingredient.name ILIKE :ingredientName', {
      ingredientName: `%${this.ingredientName}%`,
    });
  }
}
