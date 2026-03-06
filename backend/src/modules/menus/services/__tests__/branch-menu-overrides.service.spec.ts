import { BadRequestException } from '@nestjs/common';
import { BranchMenuOverridesService } from '../branch-menu-overrides.service';
import {
  BranchOverrideBulkOperation,
  BulkBranchMenuOverridesDto,
} from '../../dto/bulk-branch-menu-overrides.dto';

describe('BranchMenuOverridesService', () => {
  const branchId = '9f4a91fd-1dc9-4f0e-a98b-387f8a5c4800';
  const itemA = '31f62a2e-caf0-4af2-a280-bce8f4eb6c92';
  const itemB = 'cc84684d-dd3b-4012-a1f4-e7c3d1aeafbb';

  function createService() {
    const overrideRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(
        (
          payload: Partial<{
            id: string;
            branch_id: string;
            menu_item_id: string;
            action: 'hide';
            custom_price: number | null;
          }>,
        ) => payload,
      ),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const menuItemRepository = {
      find: jest.fn(),
    };

    const restaurantRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: branchId,
        brand_id: '4ac23e78-cba7-4b9f-9f04-2c1529a58a18',
      }),
    };

    const effectiveMenuCacheService = {
      invalidateBrand: jest.fn().mockResolvedValue(undefined),
      invalidateBranch: jest.fn().mockResolvedValue(undefined),
    };
    const auditService = {
      safeEmitLog: jest.fn().mockResolvedValue(undefined),
      markRequestAsAudited: jest.fn(),
    };

    const service = new BranchMenuOverridesService(
      overrideRepository as never,
      menuItemRepository as never,
      restaurantRepository as never,
      effectiveMenuCacheService as never,
      auditService as never,
    );

    return {
      service,
      overrideRepository,
      menuItemRepository,
      restaurantRepository,
      effectiveMenuCacheService,
    };
  }

  it('rejects missing value for required operations', async () => {
    const { service } = createService();

    const dto: BulkBranchMenuOverridesDto = {
      itemIds: [itemA],
      operation: BranchOverrideBulkOperation.SET_PRICE,
    };

    await expect(service.applyBulk(branchId, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects value for hide/unhide/clear_override operations', async () => {
    const { service } = createService();

    const dto: BulkBranchMenuOverridesDto = {
      itemIds: [itemA],
      operation: BranchOverrideBulkOperation.HIDE,
      value: 10,
    };

    await expect(service.applyBulk(branchId, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('applies hide operation successfully without value', async () => {
    const { service, menuItemRepository, overrideRepository } = createService();

    menuItemRepository.find.mockResolvedValue([{ id: itemA, price: 100 }]);

    const result = await service.applyBulk(branchId, {
      itemIds: [itemA],
      operation: BranchOverrideBulkOperation.HIDE,
    });

    expect(result).toEqual({
      affectedCount: 1,
      failedIds: [],
    });
    expect(overrideRepository.save).toHaveBeenCalledTimes(1);
  });

  it('returns failedIds and errorsById for partial failures', async () => {
    const { service, menuItemRepository } = createService();

    menuItemRepository.find.mockResolvedValue([{ id: itemA, price: 100 }]);

    const result = await service.applyBulk(branchId, {
      itemIds: [itemA, itemB],
      operation: BranchOverrideBulkOperation.SET_PRICE,
      value: 150,
    });

    expect(result.affectedCount).toBe(1);
    expect(result.failedIds).toEqual([itemB]);
    expect(result.errorsById?.[itemB]).toBeDefined();
  });
});
