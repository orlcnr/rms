import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from '../entities/menu-item.entity';
import { BranchMenuOverride } from '../entities/branch-menu-override.entity';
import { BranchCategoryOverride } from '../entities/branch-category-override.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

export interface EffectiveBranchMenuItem {
  menuItemId: string;
  basePrice: number;
  effectivePrice: number;
  customPrice: number | null;
  isVisible: boolean;
  isHiddenByItem: boolean;
  isHiddenByCategory: boolean;
  isAvailable: boolean;
}

@Injectable()
export class EffectiveMenuResolverService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(BranchMenuOverride)
    private readonly branchMenuOverrideRepository: Repository<BranchMenuOverride>,
    @InjectRepository(BranchCategoryOverride)
    private readonly branchCategoryOverrideRepository: Repository<BranchCategoryOverride>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
  ) {}

  async resolveManyForBranch(params: {
    branchId: string;
    menuItemIds: string[];
  }): Promise<Map<string, EffectiveBranchMenuItem>> {
    const uniqueIds = [...new Set(params.menuItemIds.filter(Boolean))];
    if (!uniqueIds.length) {
      return new Map();
    }

    const branch = await this.restaurantRepository.findOne({
      where: { id: params.branchId },
      select: ['id', 'brand_id'],
    });

    if (!branch) {
      return new Map();
    }

    const menuItems = await this.menuItemRepository.find({
      where: uniqueIds.map((id) => ({ id })),
      select: [
        'id',
        'price',
        'is_available',
        'category_id',
        'brand_id',
        'branch_id',
        'restaurant_id',
      ],
    });

    const scopedItems = menuItems.filter((item) => {
      if (!branch.brand_id) {
        return item.restaurant_id === params.branchId;
      }

      const isBrandItem = item.brand_id === branch.brand_id && !item.branch_id;
      const isBranchItem = item.branch_id === params.branchId;
      return isBrandItem || isBranchItem;
    });

    if (!scopedItems.length) {
      return new Map();
    }

    const scopedItemIds = scopedItems.map((item) => item.id);
    const categoryIds = [
      ...new Set(scopedItems.map((item) => item.category_id)),
    ];

    const [overrides, hiddenCategoryOverrides] = await Promise.all([
      this.branchMenuOverrideRepository.find({
        where: scopedItemIds.map((menuItemId) => ({
          branch_id: params.branchId,
          menu_item_id: menuItemId,
        })),
        select: ['menu_item_id', 'action', 'custom_price'],
      }),
      this.branchCategoryOverrideRepository.find({
        where: categoryIds.map((categoryId) => ({
          branch_id: params.branchId,
          category_id: categoryId,
          action: 'hide',
        })),
        select: ['category_id'],
      }),
    ]);

    const overrideMap = new Map(
      overrides.map((row) => [row.menu_item_id, row]),
    );
    const hiddenCategorySet = new Set(
      hiddenCategoryOverrides.map((row) => row.category_id),
    );

    const resolvedMap = new Map<string, EffectiveBranchMenuItem>();

    for (const item of scopedItems) {
      const override = overrideMap.get(item.id);
      const customPrice =
        override?.custom_price !== null && override?.custom_price !== undefined
          ? Number(override.custom_price)
          : null;
      const isHiddenByItem =
        override?.action === 'hide' && customPrice === null;
      const isHiddenByCategory = hiddenCategorySet.has(item.category_id);
      const isVisible =
        Boolean(item.is_available) && !isHiddenByItem && !isHiddenByCategory;
      const basePrice = Number(item.price);

      resolvedMap.set(item.id, {
        menuItemId: item.id,
        basePrice,
        effectivePrice: customPrice ?? basePrice,
        customPrice,
        isVisible,
        isHiddenByItem,
        isHiddenByCategory,
        isAvailable: Boolean(item.is_available),
      });
    }

    return resolvedMap;
  }

  async resolveOneForBranch(params: {
    branchId: string;
    menuItemId: string;
  }): Promise<EffectiveBranchMenuItem | null> {
    const map = await this.resolveManyForBranch({
      branchId: params.branchId,
      menuItemIds: [params.menuItemId],
    });
    return map.get(params.menuItemId) || null;
  }
}
