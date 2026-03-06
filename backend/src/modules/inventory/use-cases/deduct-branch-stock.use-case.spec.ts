import { DataSource } from 'typeorm';
import { DeductBranchStockUseCase } from './deduct-branch-stock.use-case';
import { InventoryEventFactory } from '../events/inventory-event.factory';
import { InventoryEventPublisher } from '../publishers/inventory-event.publisher';
import { Ingredient } from '../entities/ingredient.entity';

describe('DeductBranchStockUseCase', () => {
  it('returns STOCK_ROW_NOT_FOUND when ingredient row is missing', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn(),
    };

    const dataSource = {
      transaction: jest
        .fn()
        .mockImplementation((cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
    } as unknown as DataSource;

    const eventFactory = {
      createStockInsufficientEvent: jest.fn(),
      createStockDeductedEvent: jest.fn(),
    } as unknown as InventoryEventFactory;

    const eventPublisher = {
      publish: jest.fn(),
    } as unknown as InventoryEventPublisher;

    const useCase = new DeductBranchStockUseCase(
      dataSource,
      eventFactory,
      eventPublisher,
    );

    const result = await useCase.execute('branch-1', [
      { ingredientId: 'missing', quantity: 2, unit: 'adet', orderId: 'ord-1' },
    ]);

    expect(result).toEqual([
      { ingredientId: 'missing', status: 'STOCK_ROW_NOT_FOUND' },
    ]);
    const publishMock = eventPublisher['publish'] as jest.Mock;
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('does not throw when publish fails (fail-open)', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        id: 'ing-1',
        base_unit: 'adet',
        pack_size: 1,
      } as Ingredient),
      query: jest.fn().mockResolvedValue([]),
    };

    const dataSource = {
      transaction: jest
        .fn()
        .mockImplementation((cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
    } as unknown as DataSource;

    const eventFactory = {
      createStockInsufficientEvent: jest.fn().mockReturnValue({
        eventType: 'inventory.stock.insufficient',
      }),
      createStockDeductedEvent: jest.fn(),
    } as unknown as InventoryEventFactory;

    const eventPublisher = {
      publish: jest.fn().mockRejectedValue(new Error('broker down')),
    } as unknown as InventoryEventPublisher;

    const useCase = new DeductBranchStockUseCase(
      dataSource,
      eventFactory,
      eventPublisher,
    );

    await expect(
      useCase.execute('branch-1', [
        { ingredientId: 'ing-1', quantity: 5, unit: 'adet', orderId: 'ord-2' },
      ]),
    ).resolves.toEqual([
      { ingredientId: 'ing-1', status: 'INSUFFICIENT_STOCK' },
    ]);
  });
});
