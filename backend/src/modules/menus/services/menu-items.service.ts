import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  ) {}

  async create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
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

      return savedItem;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(id: string): Promise<void> {
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
