import { IngredientMapper } from './ingredient.mapper';
import { Ingredient } from '../entities/ingredient.entity';
import { BranchStock } from '../entities/branch-stock.entity';
import { BranchIngredientCost } from '../entities/branch-ingredient-cost.entity';

describe('IngredientMapper', () => {
  it('should map branch stock and branch cost to ingredient response shape', () => {
    const ingredient = {
      id: 'ing-1',
      stock: { ingredient_id: 'ing-1', quantity: 5 },
    } as Ingredient;

    const branchStock = {
      ingredient_id: 'ing-1',
      quantity: 12,
    } as BranchStock;

    const branchCost = {
      average_cost: 25,
      last_price: 30,
      previous_price: 20,
      price_updated_at: new Date('2026-01-01T00:00:00.000Z'),
    } as BranchIngredientCost;

    const result = IngredientMapper.toResponse({
      ingredient,
      branchStock,
      branchCost,
      forceBranchStock: true,
    });

    expect(result.stock?.quantity).toBe(12);
    expect(result.average_cost).toBe(25);
    expect(result.last_price).toBe(30);
    expect(result.previous_price).toBe(20);
    expect(result.price_updated_at).toEqual(branchCost.price_updated_at);
  });
});
