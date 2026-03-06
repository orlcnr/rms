import { DataSource } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { BulkUpdateStockUseCase } from './bulk-update-stock.use-case';
import { Ingredient } from '../entities/ingredient.entity';
import { BranchStock } from '../entities/branch-stock.entity';
import { Stock } from '../entities/stock.entity';
import { StockMovement } from '../entities/stock-movement.entity';

describe('BulkUpdateStockUseCase', () => {
  it('should return partial result when one ingredient fails', async () => {
    const manager = {
      findOne: jest.fn().mockImplementation((entity, options) => {
        const id = options?.where?.id || options?.where?.ingredient_id;

        if (entity === Ingredient) {
          if (id === 'missing') return Promise.resolve(null);
          return Promise.resolve({
            id,
            base_unit: 'adet',
            unit: 'adet',
          } as Ingredient);
        }

        if (entity === Stock) {
          return Promise.resolve({
            ingredient_id: id,
            quantity: 5,
          } as Stock);
        }

        if (entity === BranchStock) {
          return Promise.resolve({
            ingredient_id: options?.where?.ingredient_id,
            branch_id: options?.where?.branch_id,
            quantity: 5,
          } as BranchStock);
        }

        return Promise.resolve(null);
      }),
      save: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
    };

    const dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(manager)),
    } as unknown as DataSource;

    const auditService = {
      safeEmitLog: jest.fn().mockResolvedValue(undefined),
      markRequestAsAudited: jest.fn(),
    } as unknown as AuditService;

    const useCase = new BulkUpdateStockUseCase(dataSource, auditService);

    const result = await useCase.execute(
      [
        { ingredientId: 'ok-1', newQuantity: 20 },
        { ingredientId: 'missing', newQuantity: 10 },
      ],
      {
        id: 'user-1',
        first_name: 'Test',
        last_name: 'User',
        restaurant_id: 'branch-1',
      } as any,
      {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      } as any,
    );

    expect(result.updated).toEqual([
      {
        ingredientId: 'ok-1',
        newQty: 20,
      },
    ]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toEqual(
      expect.objectContaining({
        ingredientId: 'missing',
      }),
    );

    expect(manager.save).toHaveBeenCalledWith(
      StockMovement,
      expect.objectContaining({
        ingredient_id: 'ok-1',
        branch_id: 'branch-1',
      }),
    );
  });
});
