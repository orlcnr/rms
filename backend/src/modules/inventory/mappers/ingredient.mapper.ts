import { BranchIngredientCost } from '../entities/branch-ingredient-cost.entity';
import { BranchStock } from '../entities/branch-stock.entity';
import { Ingredient } from '../entities/ingredient.entity';
import { Stock } from '../entities/stock.entity';

export class IngredientMapper {
  static toResponse(params: {
    ingredient: Ingredient;
    branchStock?: BranchStock;
    branchCost?: BranchIngredientCost;
    forceBranchStock?: boolean;
  }): Ingredient {
    const { ingredient, branchStock, branchCost, forceBranchStock = false } =
      params;

    if (forceBranchStock || branchStock) {
      ingredient.stock = {
        ...(ingredient.stock || ({} as Stock)),
        ingredient_id: ingredient.id,
        quantity: Number(branchStock?.quantity ?? 0),
      } as Stock;
    }

    ingredient.average_cost = branchCost?.average_cost ?? null;
    ingredient.last_price = branchCost?.last_price ?? null;
    ingredient.previous_price = branchCost?.previous_price ?? null;
    ingredient.price_updated_at = branchCost?.price_updated_at ?? null;

    return ingredient;
  }
}
