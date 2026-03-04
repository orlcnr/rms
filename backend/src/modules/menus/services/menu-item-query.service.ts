import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Brackets } from 'typeorm';
import { DataSource } from 'typeorm';
import { GetMenuItemsDto } from '../dto/get-menu-items.dto';
import { MenuItemResponseDto } from '../dto/menu-item-response.dto';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import { MenuItemSpecFactory } from '../query/menu-item-spec.factory';
import { MenuItemAvailabilityService } from './menu-item-availability.service';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { BranchMenuOverride } from '../entities/branch-menu-override.entity';
import { EffectiveMenuCacheService } from './effective-menu-cache.service';

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

  private isBrandBranchMenuEnabled(): boolean {
    const value = this.configService.get<string>('ENABLE_BRAND_BRANCH_MENU');
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
      .getQuery();

    baseQuery.andWhere(`NOT EXISTS ${hiddenOverrideSubQuery}`, { branchId });

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
}
