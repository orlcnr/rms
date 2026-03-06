import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Brackets } from 'typeorm';
import { DataSource } from 'typeorm';
import { GetMenuItemsDto } from '../dto/get-menu-items.dto';
import {
  BranchItemVisibility,
  GetBranchMenuItemsDto,
} from '../dto/get-branch-menu-items.dto';
import { MenuItemResponseDto } from '../dto/menu-item-response.dto';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import { MenuItemSpecFactory } from '../query/menu-item-spec.factory';
import { MenuItemAvailabilityService } from './menu-item-availability.service';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { BranchMenuOverride } from '../entities/branch-menu-override.entity';
import { EffectiveMenuCacheService } from './effective-menu-cache.service';
import { BranchCategoryOverride } from '../entities/branch-category-override.entity';

export interface NormalizedPaginatedResult<T> {
  items: T[];
  meta: PaginationMetaDto;
}

@Injectable()
export class MenuItemQueryService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly menuItemRepository: MenuItemRepository,
    private readonly specFactory: MenuItemSpecFactory,
    private readonly availabilityService: MenuItemAvailabilityService,
    private readonly effectiveMenuCacheService: EffectiveMenuCacheService,
  ) {}

  async findAllByRestaurant(
    restaurantId: string,
    queryDto: GetMenuItemsDto,
  ): Promise<NormalizedPaginatedResult<MenuItemResponseDto>> {
    if (!this.isBrandBranchMenuEnabled()) {
      return this.findAllLegacyByRestaurant(restaurantId, queryDto);
    }

    const branch = await this.dataSource.getRepository(Restaurant).findOne({
      where: { id: restaurantId },
      select: ['id', 'brand_id'],
    });

    if (!branch?.brand_id) {
      return this.findAllLegacyByRestaurant(restaurantId, queryDto);
    }

    const cacheKey = await this.effectiveMenuCacheService.getCacheKey(
      branch.brand_id,
      restaurantId,
      queryDto,
    );
    const cached =
      await this.effectiveMenuCacheService.get<
        NormalizedPaginatedResult<MenuItemResponseDto>
      >(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.findAllByEffectiveBranchMenu(
      branch.brand_id,
      restaurantId,
      queryDto,
    );
    await this.effectiveMenuCacheService.set(cacheKey, result);
    return result;
  }

  async findBranchItemsForManagement(
    branchId: string,
    queryDto: GetBranchMenuItemsDto,
  ): Promise<NormalizedPaginatedResult<MenuItemResponseDto>> {
    const branch = await this.dataSource.getRepository(Restaurant).findOne({
      where: { id: branchId },
      select: ['id', 'brand_id'],
    });

    if (!branch?.brand_id) {
      return this.findAllLegacyByRestaurant(branchId, queryDto);
    }

    const page = queryDto.page || 1;
    const limit = Math.min(queryDto.limit || 10, 100);
    const offset = (page - 1) * limit;

    const itemHiddenCondition =
      "(branch_override.action = 'hide' AND branch_override.custom_price IS NULL)";
    const hiddenCondition = `(${itemHiddenCondition} OR category_override.id IS NOT NULL)`;

    const baseQuery = this.menuItemRepository
      .createRestaurantItemsQuery()
      .leftJoin(
        BranchMenuOverride,
        'branch_override',
        'branch_override.branch_id = :branchId AND branch_override.menu_item_id = item.id',
        { branchId },
      )
      .leftJoin(
        BranchCategoryOverride,
        'category_override',
        "category_override.branch_id = :branchId AND category_override.category_id = item.category_id AND category_override.action = 'hide'",
        { branchId },
      )
      .where(
        new Brackets((where) => {
          where
            .where('(item.brand_id = :brandId AND item.branch_id IS NULL)', {
              brandId: branch.brand_id,
            })
            .orWhere('item.branch_id = :branchId', { branchId });
        }),
      );

    for (const spec of this.specFactory.create(queryDto)) {
      spec.apply(baseQuery);
    }

    if (queryDto.overrideOnly) {
      baseQuery.andWhere('branch_override.id IS NOT NULL');
    }

    if (queryDto.visibility === BranchItemVisibility.HIDDEN) {
      if (queryDto.overrideOnly) {
        baseQuery.andWhere(itemHiddenCondition);
      } else {
        baseQuery.andWhere(hiddenCondition);
      }
    } else if (queryDto.visibility === BranchItemVisibility.VISIBLE) {
      baseQuery.andWhere(`NOT ${hiddenCondition}`);
    }

    const totalItems = await this.getTotalItems(baseQuery);
    const ids = await this.getPagedIds(baseQuery, offset, limit);

    const itemMap = new Map(
      (await this.menuItemRepository.findByIdsWithRelations(ids)).map(
        (item) => [item.id, item],
      ),
    );

    const orderedItems = ids
      .map((id) => itemMap.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const [availabilityMap, overrideMap, hiddenCategorySet] = await Promise.all(
      [
        this.availabilityService.resolveMany(orderedItems, branchId),
        this.getBranchOverrideMap(branchId, ids),
        this.getHiddenCategorySet(
          branchId,
          Array.from(new Set(orderedItems.map((item) => item.category_id))),
        ),
      ],
    );

    const items = orderedItems.map((item) => {
      const override = overrideMap.get(item.id);
      const isHiddenByItem =
        override?.action === 'hide' && override.custom_price === null;
      const isHiddenByCategory = hiddenCategorySet.has(item.category_id);
      const isHidden = isHiddenByItem || isHiddenByCategory;
      const customPrice = override?.custom_price ?? null;

      return MenuItemResponseDto.fromEntity(
        item,
        availabilityMap.get(item.id),
        customPrice,
        {
          is_hidden: isHidden,
          custom_price: customPrice,
        },
        { branchContext: true },
      );
    });

    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
    return {
      items,
      meta: new PaginationMetaDto({
        page,
        limit,
        itemCount: items.length,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      }),
    };
  }

  private isBrandBranchMenuEnabled(): boolean {
    const value = this.configService.get<string>('ENABLE_BRAND_BRANCH_MENU');
    if (value === undefined || value === null || value === '') {
      return true;
    }
    return value === 'true' || value === '1';
  }

  private async findAllLegacyByRestaurant(
    restaurantId: string,
    queryDto: GetMenuItemsDto,
  ): Promise<NormalizedPaginatedResult<MenuItemResponseDto>> {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const offset = (page - 1) * limit;

    const baseQuery = this.menuItemRepository
      .createRestaurantItemsQuery()
      .where('category.restaurant_id = :restaurantId', { restaurantId });

    for (const spec of this.specFactory.create(queryDto)) {
      spec.apply(baseQuery);
    }

    const totalItems = await this.getTotalItems(baseQuery);
    const ids = await this.getPagedIds(baseQuery, offset, limit);

    const itemMap = new Map(
      (await this.menuItemRepository.findByIdsWithRelations(ids)).map(
        (item) => [item.id, item],
      ),
    );

    const orderedItems = ids
      .map((id) => itemMap.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const availabilityMap = await this.availabilityService.resolveMany(
      orderedItems,
      restaurantId,
    );

    const items = orderedItems.map((item) =>
      MenuItemResponseDto.fromEntity(item, availabilityMap.get(item.id)),
    );

    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;

    return {
      items,
      meta: new PaginationMetaDto({
        page,
        limit,
        itemCount: items.length,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      }),
    };
  }

  private async findAllByEffectiveBranchMenu(
    brandId: string,
    branchId: string,
    queryDto: GetMenuItemsDto,
  ): Promise<NormalizedPaginatedResult<MenuItemResponseDto>> {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const offset = (page - 1) * limit;

    const baseQuery = this.menuItemRepository
      .createRestaurantItemsQuery()
      .leftJoin(
        BranchMenuOverride,
        'branch_override',
        'branch_override.branch_id = :branchId AND branch_override.menu_item_id = item.id',
        { branchId },
      )
      .where(
        new Brackets((where) => {
          where
            .where('(item.brand_id = :brandId AND item.branch_id IS NULL)', {
              brandId,
            })
            .orWhere('item.branch_id = :branchId', { branchId });
        }),
      );

    const hiddenOverrideSubQuery = this.dataSource
      .createQueryBuilder()
      .subQuery()
      .select('1')
      .from(BranchMenuOverride, 'hidden_override')
      .where('hidden_override.branch_id = :branchId')
      .andWhere('hidden_override.menu_item_id = item.id')
      .andWhere("hidden_override.action = 'hide'")
      .andWhere('hidden_override.custom_price IS NULL')
      .getQuery();

    const hiddenCategorySubQuery = this.dataSource
      .createQueryBuilder()
      .subQuery()
      .select('1')
      .from(BranchCategoryOverride, 'hidden_category_override')
      .where('hidden_category_override.branch_id = :branchId')
      .andWhere('hidden_category_override.category_id = item.category_id')
      .andWhere("hidden_category_override.action = 'hide'")
      .getQuery();

    baseQuery.andWhere(`NOT EXISTS ${hiddenOverrideSubQuery}`, { branchId });
    baseQuery.andWhere(`NOT EXISTS ${hiddenCategorySubQuery}`, { branchId });

    for (const spec of this.specFactory.create(queryDto)) {
      spec.apply(baseQuery);
    }

    const totalItems = await this.getTotalItems(baseQuery);
    const ids = await this.getPagedIds(baseQuery, offset, limit);
    const customPriceMap = await this.getCustomPriceMap(branchId, ids);

    const itemMap = new Map(
      (await this.menuItemRepository.findByIdsWithRelations(ids)).map(
        (item) => [item.id, item],
      ),
    );

    const orderedItems = ids
      .map((id) => itemMap.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const availabilityMap = await this.availabilityService.resolveMany(
      orderedItems,
      branchId,
    );

    const items = orderedItems.map((item) =>
      MenuItemResponseDto.fromEntity(
        item,
        availabilityMap.get(item.id),
        customPriceMap.get(item.id),
        undefined,
        { branchContext: true },
      ),
    );

    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;

    return {
      items,
      meta: new PaginationMetaDto({
        page,
        limit,
        itemCount: items.length,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      }),
    };
  }

  private async getTotalItems(
    baseQuery: ReturnType<MenuItemRepository['createRestaurantItemsQuery']>,
  ): Promise<number> {
    const totalRow = await baseQuery
      .clone()
      .select('COUNT(DISTINCT item.id)', 'count')
      .getRawOne<{ count: string }>();
    return Number(totalRow?.count || 0);
  }

  private async getPagedIds(
    baseQuery: ReturnType<MenuItemRepository['createRestaurantItemsQuery']>,
    offset: number,
    limit: number,
  ): Promise<string[]> {
    const pagedIds = await baseQuery
      .clone()
      .select('item.id', 'id')
      .addSelect('MIN(item.name)', 'sort_name')
      .groupBy('item.id')
      .orderBy('sort_name', 'ASC')
      .addOrderBy('item.id', 'ASC')
      .offset(offset)
      .limit(limit)
      .getRawMany<{ id: string }>();

    return pagedIds.map((row) => row.id);
  }

  private async getCustomPriceMap(
    branchId: string,
    itemIds: string[],
  ): Promise<Map<string, number>> {
    if (!itemIds.length) {
      return new Map();
    }

    const rows = await this.dataSource
      .getRepository(BranchMenuOverride)
      .createQueryBuilder('override')
      .select('override.menu_item_id', 'menu_item_id')
      .addSelect('override.custom_price', 'custom_price')
      .where('override.branch_id = :branchId', { branchId })
      .andWhere('override.menu_item_id IN (:...itemIds)', { itemIds })
      .andWhere('override.custom_price IS NOT NULL')
      .getRawMany<{ menu_item_id: string; custom_price: string }>();

    return new Map(
      rows.map((row) => [row.menu_item_id, Number(row.custom_price)]),
    );
  }

  private async getBranchOverrideMap(
    branchId: string,
    itemIds: string[],
  ): Promise<
    Map<
      string,
      {
        action: 'hide';
        custom_price: number | null;
      }
    >
  > {
    if (!itemIds.length) {
      return new Map();
    }

    const rows = await this.dataSource
      .getRepository(BranchMenuOverride)
      .createQueryBuilder('override')
      .select('override.menu_item_id', 'menu_item_id')
      .addSelect('override.action', 'action')
      .addSelect('override.custom_price', 'custom_price')
      .where('override.branch_id = :branchId', { branchId })
      .andWhere('override.menu_item_id IN (:...itemIds)', { itemIds })
      .getRawMany<{
        menu_item_id: string;
        action: 'hide';
        custom_price: string | null;
      }>();

    return new Map(
      rows.map((row) => [
        row.menu_item_id,
        {
          action: row.action,
          custom_price:
            row.custom_price !== null ? Number(row.custom_price) : null,
        },
      ]),
    );
  }

  private async getHiddenCategorySet(
    branchId: string,
    categoryIds: string[],
  ): Promise<Set<string>> {
    if (!categoryIds.length) {
      return new Set<string>();
    }

    const rows = await this.dataSource
      .getRepository(BranchCategoryOverride)
      .createQueryBuilder('override')
      .select('override.category_id', 'category_id')
      .where('override.branch_id = :branchId', { branchId })
      .andWhere("override.action = 'hide'")
      .andWhere('override.category_id IN (:...categoryIds)', { categoryIds })
      .getRawMany<{ category_id: string }>();

    return new Set(rows.map((row) => row.category_id));
  }

  async findBranchItemById(
    branchId: string,
    menuItemId: string,
  ): Promise<MenuItemResponseDto | null> {
    const branch = await this.dataSource.getRepository(Restaurant).findOne({
      where: { id: branchId },
      select: ['id', 'brand_id'],
    });

    if (!branch?.brand_id) {
      return null;
    }

    const item =
      await this.menuItemRepository.findByIdWithRelations(menuItemId);
    if (!item) {
      return null;
    }

    const isBrandItem = item.brand_id === branch.brand_id && !item.branch_id;
    const isBranchItem = item.branch_id === branchId;
    if (!isBrandItem && !isBranchItem) {
      return null;
    }

    const [availabilityMap, overrideMap, hiddenCategorySet] = await Promise.all(
      [
        this.availabilityService.resolveMany([item], branchId),
        this.getBranchOverrideMap(branchId, [item.id]),
        this.getHiddenCategorySet(branchId, [item.category_id]),
      ],
    );

    const override = overrideMap.get(item.id);
    const isHiddenByItem =
      override?.action === 'hide' && override.custom_price === null;
    const isHiddenByCategory = hiddenCategorySet.has(item.category_id);
    const isHidden = isHiddenByItem || isHiddenByCategory;
    const customPrice = override?.custom_price ?? null;

    return MenuItemResponseDto.fromEntity(
      item,
      availabilityMap.get(item.id),
      customPrice,
      {
        is_hidden: isHidden,
        custom_price: customPrice,
      },
      { branchContext: true },
    );
  }
}
