import { BranchCostService } from '../services/branch-cost.service';
import { BranchIngredientCost } from '../entities/branch-ingredient-cost.entity';

describe('BranchCostService', () => {
  let service: BranchCostService;

  beforeEach(() => {
    service = new BranchCostService();
  });

  it('should treat null average_cost as 0 in WAC calculation', async () => {
    const row: BranchIngredientCost = {
      ingredient_id: 'ing-1',
      branch_id: 'branch-1',
      average_cost: null,
      last_price: null,
      previous_price: null,
      price_updated_at: null,
    } as BranchIngredientCost;

    const manager = {
      findOne: jest.fn().mockResolvedValue(row),
      query: jest.fn(),
      create: jest.fn(),
      save: jest
        .fn()
        .mockImplementation(
          (_entity: unknown, payload: BranchIngredientCost) => payload,
        ),
    };

    const result = await service.applyInMovement({
      manager: manager as never,
      ingredientId: 'ing-1',
      branchId: 'branch-1',
      incomingQty: 10,
      currentQty: 0,
      unitPrice: 100,
    });

    expect(Number(result.average_cost)).toBe(100);
    expect(result.previous_price).toBeNull();
    expect(Number(result.last_price)).toBe(100);
    expect(manager.save).toHaveBeenCalledTimes(1);
  });

  it('should bootstrap average_cost from unitPrice when average_cost is null and stock exists', async () => {
    const row: BranchIngredientCost = {
      ingredient_id: 'ing-1',
      branch_id: 'branch-1',
      average_cost: null,
      last_price: null,
      previous_price: null,
      price_updated_at: null,
    } as BranchIngredientCost;

    const manager = {
      findOne: jest.fn().mockResolvedValue(row),
      query: jest.fn(),
      create: jest.fn(),
      save: jest
        .fn()
        .mockImplementation(
          (_entity: unknown, payload: BranchIngredientCost) => payload,
        ),
    };

    const result = await service.applyInMovement({
      manager: manager as never,
      ingredientId: 'ing-1',
      branchId: 'branch-1',
      incomingQty: 10,
      currentQty: 30,
      unitPrice: 4000,
    });

    expect(Number(result.average_cost)).toBe(4000);
    expect(Number(result.last_price)).toBe(4000);
    expect(result.previous_price).toBeNull();
    expect(manager.save).toHaveBeenCalledTimes(1);
  });

  it('should calculate weighted average correctly', async () => {
    const row: BranchIngredientCost = {
      ingredient_id: 'ing-1',
      branch_id: 'branch-1',
      average_cost: 50,
      last_price: 50,
      previous_price: 45,
      price_updated_at: new Date(),
    } as BranchIngredientCost;

    const manager = {
      findOne: jest.fn().mockResolvedValue(row),
      query: jest.fn(),
      create: jest.fn(),
      save: jest
        .fn()
        .mockImplementation(
          (_entity: unknown, payload: BranchIngredientCost) => payload,
        ),
    };

    const result = await service.applyInMovement({
      manager: manager as never,
      ingredientId: 'ing-1',
      branchId: 'branch-1',
      incomingQty: 20,
      currentQty: 100,
      unitPrice: 80,
    });

    expect(Number(result.average_cost)).toBeCloseTo(55, 2);
    expect(Number(result.previous_price)).toBe(50);
    expect(Number(result.last_price)).toBe(80);
  });

  it('should skip update when incomingQty is zero', async () => {
    const row: BranchIngredientCost = {
      ingredient_id: 'ing-1',
      branch_id: 'branch-1',
      average_cost: 60,
      last_price: 60,
      previous_price: 55,
      price_updated_at: new Date(),
    } as BranchIngredientCost;

    const manager = {
      findOne: jest.fn().mockResolvedValue(row),
      query: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const result = await service.applyInMovement({
      manager: manager as never,
      ingredientId: 'ing-1',
      branchId: 'branch-1',
      incomingQty: 0,
      currentQty: 100,
      unitPrice: 80,
    });

    expect(result).toBe(row);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('should skip update when denominator is zero or below', async () => {
    const row: BranchIngredientCost = {
      ingredient_id: 'ing-1',
      branch_id: 'branch-1',
      average_cost: 60,
      last_price: 60,
      previous_price: 55,
      price_updated_at: new Date(),
    } as BranchIngredientCost;

    const manager = {
      findOne: jest.fn().mockResolvedValue(row),
      query: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const result = await service.applyInMovement({
      manager: manager as never,
      ingredientId: 'ing-1',
      branchId: 'branch-1',
      incomingQty: 5,
      currentQty: -5,
      unitPrice: 80,
    });

    expect(result).toBe(row);
    expect(manager.save).not.toHaveBeenCalled();
  });
});
