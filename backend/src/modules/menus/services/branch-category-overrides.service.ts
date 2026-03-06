import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource } from 'typeorm';
import { BranchCategoryOverride } from '../entities/branch-category-override.entity';
import { BranchMenuOverride } from '../entities/branch-menu-override.entity';
import { Category } from '../entities/category.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { MenuItem } from '../entities/menu-item.entity';
import { Role } from '../../../common/enums/role.enum';
import { EffectiveMenuCacheService } from './effective-menu-cache.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';

type ScopedUser = {
  id: string;
  role: Role;
  brandId?: string | null;
  branchId?: string | null;
  restaurantId?: string | null;
  restaurant_id?: string | null;
};

export interface BranchCategoryView {
  categoryId: string;
  name: string;
  isHiddenInBranch: boolean;
  productCount?: number;
  hiddenProductCount?: number;
}

@Injectable()
export class BranchCategoryOverridesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BranchCategoryOverride)
    private readonly branchCategoryOverrideRepository: Repository<BranchCategoryOverride>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    private readonly effectiveMenuCacheService: EffectiveMenuCacheService,
    private readonly auditService: AuditService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private buildActorName(user: ScopedUser): string | undefined {
    if (!user?.id) {
      return undefined;
    }
    return user.id;
  }

  private resolveAuditRestaurantId(user: ScopedUser, branchId: string): string {
    return user.restaurant_id || user.restaurantId || branchId;
  }

  private async getBranchOrThrow(branchId: string): Promise<Restaurant> {
    const branch = await this.restaurantRepository.findOne({
      where: { id: branchId },
      select: ['id', 'brand_id'],
    });

    if (!branch) {
      throw new NotFoundException(`Branch #${branchId} not found`);
    }

    return branch;
  }

  private assertBranchScope(user: ScopedUser, branch: Restaurant): void {
    const role = user.role;

    if (role === Role.SUPER_ADMIN) {
      return;
    }

    const userBranchId = user.branchId || user.restaurant_id || null;
    const userBrandId = user.brandId || null;

    if (
      (role === Role.BRANCH_MANAGER || role === Role.MANAGER) &&
      userBranchId &&
      userBranchId === branch.id
    ) {
      return;
    }

    if (
      (role === Role.BRAND_OWNER || role === Role.RESTAURANT_OWNER) &&
      userBrandId &&
      userBrandId === branch.brand_id
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission for this branch operation',
    );
  }

  private async invalidateBranchCaches(branch: Restaurant): Promise<void> {
    await this.effectiveMenuCacheService.invalidateBranch(branch.id);
    if (branch.brand_id) {
      await this.effectiveMenuCacheService.invalidateBrand(branch.brand_id);
    }

    const statsKey =
      await this.effectiveMenuCacheService.getCategoryVisibilityStatsCacheKey(
        branch.id,
        branch.brand_id,
      );
    await this.cacheManager.del(statsKey);
  }

  async getBranchCategories(
    branchId: string,
    includeStats: boolean,
    user: ScopedUser,
  ): Promise<BranchCategoryView[]> {
    const branch = await this.getBranchOrThrow(branchId);
    this.assertBranchScope(user, branch);
    if (!branch.brand_id) {
      throw new UnprocessableEntityException({
        code: 'BRANCH_BRAND_SCOPE_MISSING',
        message: 'Branch brand scope is missing',
      });
    }

    const statsKey =
      await this.effectiveMenuCacheService.getCategoryVisibilityStatsCacheKey(
        branchId,
        branch.brand_id,
      );

    if (includeStats) {
      const cached =
        await this.cacheManager.get<BranchCategoryView[]>(statsKey);
      if (cached) {
        return cached;
      }
    }

    const rawRows = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin(
        BranchCategoryOverride,
        'category_override',
        'category_override.branch_id = :branchId AND category_override.category_id = category.id AND category_override.action = :hideAction',
        { branchId, hideAction: 'hide' },
      )
      .leftJoin(
        MenuItem,
        'item',
        '(item.category_id = category.id) AND (item.brand_id = :brandId OR item.branch_id = :branchId)',
        { brandId: branch.brand_id, branchId },
      )
      .leftJoin(
        BranchMenuOverride,
        'manual_override',
        "manual_override.branch_id = :branchId AND manual_override.menu_item_id = item.id AND manual_override.action = 'hide' AND manual_override.custom_price IS NULL",
        { branchId },
      )
      .where('category.brand_id = :brandId', { brandId: branch.brand_id })
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'name')
      .addSelect(
        'CASE WHEN category_override.id IS NOT NULL THEN true ELSE false END',
        'isHiddenInBranch',
      )
      .addSelect('COUNT(item.id)', 'productCount')
      .addSelect(
        'COUNT(CASE WHEN category_override.id IS NOT NULL OR manual_override.id IS NOT NULL THEN 1 END)',
        'hiddenProductCount',
      )
      .groupBy('category.id')
      .addGroupBy('category.name')
      .addGroupBy('category_override.id')
      .orderBy('category.name', 'ASC')
      .getRawMany<{
        categoryId: string;
        name: string;
        isHiddenInBranch: boolean | string;
        productCount: string;
        hiddenProductCount: string;
      }>();

    const rows = rawRows.map((row) => ({
      categoryId: row.categoryId,
      name: row.name,
      isHiddenInBranch:
        row.isHiddenInBranch === true || row.isHiddenInBranch === 'true',
      ...(includeStats
        ? {
            productCount: Number(row.productCount || 0),
            hiddenProductCount: Number(row.hiddenProductCount || 0),
          }
        : {}),
    }));

    if (includeStats) {
      await this.cacheManager.set(statsKey, rows, 60);
    }

    return rows;
  }

  async excludeCategory(
    branchId: string,
    categoryId: string,
    user: ScopedUser,
    request?: Request,
  ): Promise<{ affectedProducts: number }> {
    const branch = await this.getBranchOrThrow(branchId);
    this.assertBranchScope(user, branch);

    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      select: ['id', 'brand_id'],
    });

    if (!category || category.brand_id !== branch.brand_id) {
      throw new NotFoundException(
        `Category #${categoryId} not found for this branch brand scope`,
      );
    }

    const affectedProducts = await this.menuItemRepository.count({
      where: {
        category_id: categoryId,
        brand_id: branch.brand_id,
      },
    });

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(BranchCategoryOverride);
      const existing = await repo.findOne({
        where: {
          branch_id: branchId,
          category_id: categoryId,
        },
      });

      await repo.save(
        repo.create({
          ...(existing || {}),
          branch_id: branchId,
          category_id: categoryId,
          action: 'hide',
        }),
      );
    });

    await this.invalidateBranchCaches(branch);

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.BRANCH_CATEGORY_HIDDEN,
        resource: 'MENUS',
        user_id: user.id,
        user_name: this.buildActorName(user),
        restaurant_id: this.resolveAuditRestaurantId(user, branchId),
        payload: {
          branchId,
          categoryId,
        },
        changes: sanitizeAuditChanges({
          after: {
            category_id: categoryId,
            action: 'hide',
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'BranchCategoryOverridesService.excludeCategory',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return { affectedProducts };
  }

  async includeCategory(
    branchId: string,
    categoryId: string,
    user: ScopedUser,
    request?: Request,
  ): Promise<{ affectedProducts: number }> {
    const branch = await this.getBranchOrThrow(branchId);
    this.assertBranchScope(user, branch);

    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      select: ['id', 'brand_id'],
    });

    if (!category || category.brand_id !== branch.brand_id) {
      throw new NotFoundException(
        `Category #${categoryId} not found for this branch brand scope`,
      );
    }

    const affectedProducts = await this.menuItemRepository.count({
      where: {
        category_id: categoryId,
        brand_id: branch.brand_id,
      },
    });

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(BranchCategoryOverride);
      await repo.delete({
        branch_id: branchId,
        category_id: categoryId,
      });
    });

    await this.invalidateBranchCaches(branch);

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.BRANCH_CATEGORY_SHOWN,
        resource: 'MENUS',
        user_id: user.id,
        user_name: this.buildActorName(user),
        restaurant_id: this.resolveAuditRestaurantId(user, branchId),
        payload: {
          branchId,
          categoryId,
        },
        changes: sanitizeAuditChanges({
          before: {
            category_id: categoryId,
            action: 'hide',
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'BranchCategoryOverridesService.includeCategory',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return { affectedProducts };
  }

  async excludeAllCategories(
    branchId: string,
    user: ScopedUser,
    categoryIds?: string[],
    request?: Request,
  ): Promise<{ affectedCategories: number; affectedProducts: number }> {
    const branch = await this.getBranchOrThrow(branchId);
    this.assertBranchScope(user, branch);

    const query = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.brand_id = :brandId', { brandId: branch.brand_id })
      .select('category.id', 'id');

    if (categoryIds?.length) {
      query.andWhere('category.id IN (:...categoryIds)', { categoryIds });
    }

    const categories = await query.getRawMany<{ id: string }>();
    const ids = categories.map((row) => row.id);

    let affectedProducts = 0;
    if (ids.length) {
      affectedProducts = await this.menuItemRepository
        .createQueryBuilder('item')
        .where('item.category_id IN (:...ids)', { ids })
        .andWhere('(item.brand_id = :brandId OR item.branch_id = :branchId)', {
          brandId: branch.brand_id,
          branchId,
        })
        .getCount();
    }

    await this.dataSource.transaction(async (manager) => {
      if (!ids.length) {
        return;
      }

      const repo = manager.getRepository(BranchCategoryOverride);
      const existing = await repo.find({
        where: {
          branch_id: branchId,
          category_id: In(ids),
        },
      });
      const existingSet = new Set(existing.map((item) => item.category_id));

      const newRows = ids
        .filter((id) => !existingSet.has(id))
        .map((id) =>
          repo.create({
            branch_id: branchId,
            category_id: id,
            action: 'hide',
          }),
        );

      if (newRows.length) {
        await repo.save(newRows);
      }
    });

    await this.invalidateBranchCaches(branch);

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.BRANCH_CATEGORIES_HIDDEN_BULK,
        resource: 'MENUS',
        user_id: user.id,
        user_name: this.buildActorName(user),
        restaurant_id: this.resolveAuditRestaurantId(user, branchId),
        payload: {
          branchId,
        },
        changes: {
          meta: {
            operation: 'hide',
            itemCount: ids.length,
            affectedCount: ids.length,
            failedIds: [],
          },
        },
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'BranchCategoryOverridesService.excludeAllCategories',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return {
      affectedCategories: ids.length,
      affectedProducts,
    };
  }

  async includeAllCategories(
    branchId: string,
    user: ScopedUser,
    categoryIds?: string[],
    request?: Request,
  ): Promise<{ affectedCategories: number; affectedProducts: number }> {
    const branch = await this.getBranchOrThrow(branchId);
    this.assertBranchScope(user, branch);

    const query = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.brand_id = :brandId', { brandId: branch.brand_id })
      .select('category.id', 'id');

    if (categoryIds?.length) {
      query.andWhere('category.id IN (:...categoryIds)', { categoryIds });
    }

    const categories = await query.getRawMany<{ id: string }>();
    const ids = categories.map((row) => row.id);

    let affectedProducts = 0;
    if (ids.length) {
      affectedProducts = await this.menuItemRepository
        .createQueryBuilder('item')
        .where('item.category_id IN (:...ids)', { ids })
        .andWhere('(item.brand_id = :brandId OR item.branch_id = :branchId)', {
          brandId: branch.brand_id,
          branchId,
        })
        .getCount();
    }

    await this.dataSource.transaction(async (manager) => {
      if (!ids.length) {
        return;
      }

      const repo = manager.getRepository(BranchCategoryOverride);
      await repo
        .createQueryBuilder()
        .delete()
        .where('branch_id = :branchId', { branchId })
        .andWhere('category_id IN (:...ids)', { ids })
        .execute();
    });

    await this.invalidateBranchCaches(branch);

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.BRANCH_CATEGORIES_SHOWN_BULK,
        resource: 'MENUS',
        user_id: user.id,
        user_name: this.buildActorName(user),
        restaurant_id: this.resolveAuditRestaurantId(user, branchId),
        payload: {
          branchId,
        },
        changes: {
          meta: {
            operation: 'unhide',
            itemCount: ids.length,
            affectedCount: ids.length,
            failedIds: [],
          },
        },
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'BranchCategoryOverridesService.includeAllCategories',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return {
      affectedCategories: ids.length,
      affectedProducts,
    };
  }
}
