import { Injectable } from '@nestjs/common';
import { Category } from './entities/category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { GetMenuItemsDto } from './dto/get-menu-items.dto';
import { MenuItemResponseDto } from './dto/menu-item-response.dto';
import {
  MenuItemQueryService,
  NormalizedPaginatedResult,
} from './services/menu-item-query.service';
import { CategoriesService } from './services/categories.service';
import { MenuItemsService } from './services/menu-items.service';
import { BranchMenuOverridesService } from './services/branch-menu-overrides.service';
import { UpsertBranchMenuOverrideDto } from './dto/upsert-branch-menu-override.dto';
import { BranchMenuOverride } from './entities/branch-menu-override.entity';

@Injectable()
export class MenusService {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly menuItemsService: MenuItemsService,
    private readonly menuItemQueryService: MenuItemQueryService,
    private readonly branchMenuOverridesService: BranchMenuOverridesService,
  ) {}

  // Category Methods
  async createCategory(
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.create(createCategoryDto);
  }

  async findAllCategoriesByRestaurant(
    restaurantId: string,
  ): Promise<Category[]> {
    return this.categoriesService.findAllByRestaurant(restaurantId);
  }

  async updateCategory(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  async deleteCategory(id: string): Promise<void> {
    return this.categoriesService.delete(id);
  }

  // MenuItem Methods
  async createMenuItem(
    createMenuItemDto: CreateMenuItemDto,
  ): Promise<MenuItem> {
    return this.menuItemsService.create(createMenuItemDto);
  }

  async findAllMenuItemsByCategory(categoryId: string): Promise<MenuItem[]> {
    return this.menuItemsService.findAllByCategory(categoryId);
  }

  async findAllMenuItemsByRestaurant(
    restaurantId: string,
    queryDto: GetMenuItemsDto,
  ): Promise<NormalizedPaginatedResult<MenuItemResponseDto>> {
    return this.menuItemQueryService.findAllByRestaurant(
      restaurantId,
      queryDto,
    );
  }

  async updateMenuItem(
    id: string,
    updateMenuItemDto: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    return this.menuItemsService.update(id, updateMenuItemDto);
  }

  async deleteMenuItem(id: string): Promise<void> {
    return this.menuItemsService.delete(id);
  }

  async findMenuItemById(id: string): Promise<MenuItemResponseDto> {
    return this.menuItemsService.findById(id);
  }

  async upsertBranchMenuOverride(
    branchId: string,
    menuItemId: string,
    dto: UpsertBranchMenuOverrideDto,
  ): Promise<BranchMenuOverride> {
    return this.branchMenuOverridesService.upsert(branchId, menuItemId, dto);
  }

  async deleteBranchMenuOverride(
    branchId: string,
    menuItemId: string,
  ): Promise<void> {
    return this.branchMenuOverridesService.remove(branchId, menuItemId);
  }
}
