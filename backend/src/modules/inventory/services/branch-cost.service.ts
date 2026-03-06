import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BranchIngredientCost } from '../entities/branch-ingredient-cost.entity';

@Injectable()
export class BranchCostService {
  async getOrCreate(
    manager: EntityManager,
    ingredientId: string,
    branchId: string,
  ): Promise<BranchIngredientCost> {
    let row = await manager.findOne(BranchIngredientCost, {
      where: { ingredient_id: ingredientId, branch_id: branchId },
      lock: { mode: 'pessimistic_write' },
    });

    if (row) {
      return row;
    }

    await manager.query(
      `
      INSERT INTO operations.branch_ingredient_costs (
        ingredient_id,
        branch_id,
        average_cost,
        last_price,
        previous_price,
        price_updated_at
      )
      VALUES ($1, $2, NULL, NULL, NULL, NULL)
      ON CONFLICT (ingredient_id, branch_id) DO NOTHING
      `,
      [ingredientId, branchId],
    );

    row = await manager.findOne(BranchIngredientCost, {
      where: { ingredient_id: ingredientId, branch_id: branchId },
      lock: { mode: 'pessimistic_write' },
    });

    if (row) {
      return row;
    }

    return manager.create(BranchIngredientCost, {
      ingredient_id: ingredientId,
      branch_id: branchId,
      average_cost: null,
      last_price: null,
      previous_price: null,
      price_updated_at: null,
    });
  }

  async applyInMovement(params: {
    manager: EntityManager;
    ingredientId: string;
    branchId: string;
    incomingQty: number;
    currentQty: number;
    unitPrice: number;
  }): Promise<BranchIngredientCost> {
    const {
      manager,
      ingredientId,
      branchId,
      incomingQty,
      currentQty,
      unitPrice,
    } = params;

    const row = await this.getOrCreate(manager, ingredientId, branchId);

    if (incomingQty <= 0) {
      return row;
    }

    const currentCost = Number(row.average_cost ?? 0);
    const normalizedCurrentQty = Number(currentQty ?? 0);
    const denominator = normalizedCurrentQty + incomingQty;

    if (denominator <= 0) {
      return row;
    }

    // Cost is unknown for this branch yet: bootstrap directly from first purchase
    // instead of diluting with an artificial zero-cost inventory.
    const hasKnownAverageCost = row.average_cost !== null;
    const newAverageCost = hasKnownAverageCost
      ? Math.round(
          ((normalizedCurrentQty * currentCost + incomingQty * unitPrice) /
            denominator) *
            100,
        ) / 100
      : Math.round(unitPrice * 100) / 100;

    row.previous_price = row.last_price;
    row.last_price = unitPrice;
    row.average_cost = newAverageCost;
    row.price_updated_at = new Date();

    return manager.save(BranchIngredientCost, row);
  }
}
