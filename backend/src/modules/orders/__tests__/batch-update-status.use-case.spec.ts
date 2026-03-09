import { BatchUpdateStatusUseCase } from '../use-cases/batch-update-status.use-case';
import { OrderStatus } from '../enums/order-status.enum';
import { DataSource } from 'typeorm';
import { RulesService } from '../../rules/rules.service';

describe('BatchUpdateStatusUseCase', () => {
  it('returns partial failure deterministically (updated + failed)', async () => {
    const qbMock = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const managerMock = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'order-1',
          restaurantId: 'rest-1',
          status: OrderStatus.PENDING,
          items: [],
          tableId: null,
        },
        {
          id: 'order-2',
          restaurantId: 'rest-2',
          status: OrderStatus.PENDING,
          items: [],
          tableId: null,
        },
      ]),
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      count: jest.fn().mockResolvedValue(1),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const dataSourceMock = {
      transaction: jest.fn((cb: (manager: typeof managerMock) => unknown) =>
        cb(managerMock),
      ),
    } as unknown as DataSource;

    const rulesServiceMock = {
      checkRule: jest.fn(),
    } as unknown as RulesService;

    const useCase = new BatchUpdateStatusUseCase(
      dataSourceMock,
      rulesServiceMock,
    );

    const result = await useCase.execute({
      orderIds: ['order-1', 'order-2', 'order-3'],
      targetStatus: OrderStatus.PREPARING,
      restaurantId: 'rest-1',
    });

    expect(result.updatedOrderIds).toEqual(['order-1']);
    expect(result.failed).toHaveLength(2);
    expect(result.failed.map((item) => item.orderId).sort()).toEqual([
      'order-2',
      'order-3',
    ]);
  });
});
