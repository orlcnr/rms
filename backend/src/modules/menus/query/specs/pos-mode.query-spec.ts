import { Brackets, SelectQueryBuilder } from 'typeorm';
import { MenuItem } from '../../entities/menu-item.entity';
import { QuerySpec } from './query-spec.interface';
import { Recipe } from '../../../inventory/entities/recipe.entity';
import { Ingredient } from '../../../inventory/entities/ingredient.entity';
import { Stock } from '../../../inventory/entities/stock.entity';

export class PosModeSpec implements QuerySpec<MenuItem> {
  apply(qb: SelectQueryBuilder<MenuItem>): SelectQueryBuilder<MenuItem> {
    qb.andWhere('item.is_available = :isAvailable', {
      isAvailable: true,
    });

    return qb.andWhere(
      new Brackets((builder) => {
        builder
          .where('item.track_inventory = false')
          .orWhere('item.track_inventory IS NULL')
          .orWhere((subBuilder) => {
            const subQuery = subBuilder
              .subQuery()
              .select('1')
              .from(Recipe, 'r')
              .leftJoin(Ingredient, 'i', 'i.id = r.ingredient_id')
              .leftJoin(Stock, 's', 's.ingredient_id = i.id')
              .where('r.product_id = item.id')
              .andWhere('s.quantity <= 0')
              .getQuery();

            return `NOT EXISTS ${subQuery}`;
          });
      }),
    );
  }
}
