import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Ingredient } from '../../../entities/ingredient.entity';

export interface IngredientScopeContext {
  restaurantId: string;
  brandId?: string | null;
}

export class IngredientScopeSpec implements QuerySpec<Ingredient> {
  constructor(private readonly context: IngredientScopeContext) {}

  apply(qb: SelectQueryBuilder<Ingredient>): SelectQueryBuilder<Ingredient> {
    if (this.context.brandId) {
      return qb.where('ingredient.brand_id = :brandId', {
        brandId: this.context.brandId,
      });
    }

    return qb.where('ingredient.restaurant_id = :restaurantId', {
      restaurantId: this.context.restaurantId,
    });
  }
}
