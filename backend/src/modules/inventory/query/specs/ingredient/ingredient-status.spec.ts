import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Ingredient } from '../../../entities/ingredient.entity';
import { StockStatus } from '../../../enums/stock-status.enum';

export class IngredientStatusSpec implements QuerySpec<Ingredient> {
  constructor(
    private readonly status: StockStatus,
    private readonly quantityExpr: string,
  ) {}

  apply(qb: SelectQueryBuilder<Ingredient>): SelectQueryBuilder<Ingredient> {
    if (this.status === StockStatus.CRITICAL) {
      return qb
        .andWhere(`${this.quantityExpr} > 0`)
        .andWhere(`${this.quantityExpr} <= ingredient.critical_level`);
    }

    if (this.status === StockStatus.OUT_OF_STOCK) {
      return qb.andWhere(`${this.quantityExpr} <= 0`);
    }

    if (this.status === StockStatus.HEALTHY) {
      return qb.andWhere(`${this.quantityExpr} > ingredient.critical_level`);
    }

    return qb;
  }
}
