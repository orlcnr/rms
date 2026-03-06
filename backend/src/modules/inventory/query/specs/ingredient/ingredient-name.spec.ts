import { SelectQueryBuilder } from 'typeorm';
import { QuerySpec } from '../../../../../common/query/query-spec.interface';
import { Ingredient } from '../../../entities/ingredient.entity';

export class IngredientNameSpec implements QuerySpec<Ingredient> {
  constructor(private readonly name: string) {}

  apply(qb: SelectQueryBuilder<Ingredient>): SelectQueryBuilder<Ingredient> {
    return qb.andWhere('ingredient.name ILIKE :name', {
      name: `%${this.name}%`,
    });
  }
}
