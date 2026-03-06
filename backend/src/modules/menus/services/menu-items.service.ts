import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { MenuItem } from '../entities/menu-item.entity';
import { CreateMenuItemDto } from '../dto/create-menu-item.dto';
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto';
import { MenuItemResponseDto } from '../dto/menu-item-response.dto';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import { RecipeRepository } from '../repositories/recipe.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CategoriesService } from './categories.service';
import { RulesService } from '../../rules/rules.service';
import { RuleKey } from '../../rules/enums/rule-key.enum';
import { EffectiveMenuCacheService } from './effective-menu-cache.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';
import type { User } from '../../users/entities/user.entity';

@Injectable()
export class MenuItemsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly menuItemRepository: MenuItemRepository,
    private readonly recipeRepository: RecipeRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly categoriesService: CategoriesService,
    private readonly rulesService: RulesService,
    private readonly effectiveMenuCacheService: EffectiveMenuCacheService,
    private readonly auditService: AuditService,
  ) {}

  private buildActorName(user?: User): string | undefined {
    if (!user?.first_name) {
      return undefined;
    }
    return `${user.first_name} ${user.last_name || ''}`.trim();
  }

  async create(
    createMenuItemDto: CreateMenuItemDto,
    actor?: User,
    request?: Request,
  ): Promise<MenuItem> {
    const { recipes = [], ...itemData } = createMenuItemDto;
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const category = await this.categoryRepository.findByIdWithRestaurant(
        itemData.category_id,
      );
      if (!category) {
        throw new NotFoundException(
          `Category #${itemData.category_id} not found`,
        );
      }

      const savedItem = await this.menuItemRepository.createAndSave(
        {
          ...itemData,
          restaurant_id: itemData.branch_id || category.restaurant_id,
          brand_id:
            category.brand_id || category.restaurant?.brand_id || undefined,
          branch_id: itemData.branch_id || undefined,
        },
        queryRunner.manager,
      );

      if (itemData.track_inventory && recipes.length > 0) {
        await queryRunner.manager.save(
          this.recipeRepository.createManyForProduct(savedItem.id, recipes),
        );
      }

      await queryRunner.commitTransaction();

      if (category) {
        await this.categoriesService.clearCache(category.restaurant_id);
      }
      if (category?.brand_id) {
        await this.effectiveMenuCacheService.invalidateBrand(category.brand_id);
      }
      if (savedItem.branch_id) {
        await this.effectiveMenuCacheService.invalidateBranch(
          savedItem.branch_id,
        );
      }

      await this.auditService.safeEmitLog(
        {
          action: AuditAction.MENU_ITEM_CREATED,
          resource: 'MENUS',
          user_id: actor?.id,
          user_name: this.buildActorName(actor),
          restaurant_id: savedItem.restaurant_id,
          payload: {
            menuItemId: savedItem.id,
            categoryId: savedItem.category_id,
            restaurantId: savedItem.restaurant_id,
            brandId: savedItem.brand_id,
            branchId: savedItem.branch_id,
          },
          changes: sanitizeAuditChanges({
            after: {
              id: savedItem.id,
              name: savedItem.name,
              price: savedItem.price,
              category_id: savedItem.category_id,
              restaurant_id: savedItem.restaurant_id,
              brand_id: savedItem.brand_id,
              branch_id: savedItem.branch_id,
              is_available: savedItem.is_available,
              track_inventory: savedItem.track_inventory,
            },
          }),
          ip_address: request?.ip,
          user_agent: request?.headers['user-agent'],
        },
        'MenuItemsService.create',
      );
      this.auditService.markRequestAsAudited(
        request as unknown as Record<string, unknown>,
      );

      return savedItem;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    id: string,
    updateMenuItemDto: UpdateMenuItemDto,
    actor?: User,
    request?: Request,
  ): Promise<MenuItem> {
    const { recipes = [], ...itemData } = updateMenuItemDto;
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingItem =
        await this.menuItemRepository.findByIdWithCategory(id);

      if (!existingItem) {
        throw new NotFoundException(`MenuItem #${id} not found`);
      }

      const beforeSnapshot = {
        id: existingItem.id,
        name: existingItem.name,
        price: existingItem.price,
        category_id: existingItem.category_id,
        restaurant_id: existingItem.restaurant_id,
        brand_id: existingItem.brand_id,
        branch_id: existingItem.branch_id,
        is_available: existingItem.is_available,
        track_inventory: existingItem.track_inventory,
      };

      Object.assign(existingItem, itemData);
      const savedItem = await this.menuItemRepository.save(
        existingItem,
        queryRunner.manager,
      );

      await this.recipeRepository.replaceForProduct(
        id,
        itemData.track_inventory ? recipes : [],
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      await this.categoriesService.clearCache(
        existingItem.category.restaurant_id,
      );
      if (existingItem.brand_id) {
        await this.effectiveMenuCacheService.invalidateBrand(
          existingItem.brand_id,
        );
      }
      if (existingItem.branch_id) {
        await this.effectiveMenuCacheService.invalidateBranch(
          existingItem.branch_id,
        );
      }

      await this.auditService.safeEmitLog(
        {
          action: AuditAction.MENU_ITEM_UPDATED,
          resource: 'MENUS',
          user_id: actor?.id,
          user_name: this.buildActorName(actor),
          restaurant_id: savedItem.restaurant_id,
          payload: {
            menuItemId: savedItem.id,
            categoryId: savedItem.category_id,
            restaurantId: savedItem.restaurant_id,
            brandId: savedItem.brand_id,
            branchId: savedItem.branch_id,
          },
          changes: sanitizeAuditChanges({
            before: beforeSnapshot,
            after: {
              id: savedItem.id,
              name: savedItem.name,
              price: savedItem.price,
              category_id: savedItem.category_id,
              restaurant_id: savedItem.restaurant_id,
              brand_id: savedItem.brand_id,
              branch_id: savedItem.branch_id,
              is_available: savedItem.is_available,
              track_inventory: savedItem.track_inventory,
            },
          }),
          ip_address: request?.ip,
          user_agent: request?.headers['user-agent'],
        },
        'MenuItemsService.update',
      );
      this.auditService.markRequestAsAudited(
        request as unknown as Record<string, unknown>,
      );

      return savedItem;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(id: string, actor?: User, request?: Request): Promise<void> {
    const item = await this.menuItemRepository.findByIdWithCategory(id);

    if (!item) {
      throw new NotFoundException(`MenuItem #${id} not found`);
    }

    await this.rulesService.checkRule(
      item.category.restaurant_id,
      RuleKey.MENU_PREVENT_DELETE_ITEM,
      id,
      'Bu ürün silinemez: Aktif siparişlerde kullanılmıştır.',
    );

    await this.menuItemRepository.deleteById(id);
    await this.categoriesService.clearCache(item.category.restaurant_id);
    if (item.brand_id) {
      await this.effectiveMenuCacheService.invalidateBrand(item.brand_id);
    }
    if (item.branch_id) {
      await this.effectiveMenuCacheService.invalidateBranch(item.branch_id);
    }

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.MENU_ITEM_DELETED,
        resource: 'MENUS',
        user_id: actor?.id,
        user_name: this.buildActorName(actor),
        restaurant_id: item.restaurant_id,
        payload: {
          menuItemId: id,
          categoryId: item.category_id,
          restaurantId: item.restaurant_id,
          brandId: item.brand_id,
          branchId: item.branch_id,
        },
        changes: sanitizeAuditChanges({
          before: {
            id: item.id,
            name: item.name,
            price: item.price,
            category_id: item.category_id,
            restaurant_id: item.restaurant_id,
            brand_id: item.brand_id,
            branch_id: item.branch_id,
            is_available: item.is_available,
            track_inventory: item.track_inventory,
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'MenuItemsService.delete',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );
  }

  async findById(id: string): Promise<MenuItemResponseDto> {
    const item = await this.menuItemRepository.findByIdWithRelations(id);

    if (!item) {
      throw new NotFoundException(`MenuItem #${id} not found`);
    }

    if (item.recipes?.length) {
      item.recipes = item.recipes.map((recipe) => ({
        ...recipe,
        quantity: Number(recipe.quantity),
      }));
    }

    return MenuItemResponseDto.fromEntity(item);
  }

  async findAllByCategory(categoryId: string): Promise<MenuItem[]> {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    return this.menuItemRepository.findByCategoryWithRelations(categoryId);
  }
}
