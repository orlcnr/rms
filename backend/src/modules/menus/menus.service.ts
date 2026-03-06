import { Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
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
import {
  BranchCategoryOverridesService,
  BranchCategoryView,
} from './services/branch-category-overrides.service';
import { GetBranchCategoriesDto } from './dto/get-branch-categories.dto';
import type { User } from '../users/entities/user.entity';
import { GetBranchMenuItemsDto } from './dto/get-branch-menu-items.dto';
import {
  BulkBranchMenuOverridesDto,
  BulkBranchMenuOverridesResult,
} from './dto/bulk-branch-menu-overrides.dto';

@Injectable()
export class MenusService {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly menuItemsService: MenuItemsService,
    private readonly menuItemQueryService: MenuItemQueryService,
    private readonly branchMenuOverridesService: BranchMenuOverridesService,
    private readonly branchCategoryOverridesService: BranchCategoryOverridesService,
  ) {}

  // Category Methods
  async createCategory(
    createCategoryDto: CreateCategoryDto,
    actor?: User,
    request?: Request,
  ): Promise<Category> {
    return this.categoriesService.create(createCategoryDto, actor, request);
  }

  async findAllCategoriesByRestaurant(
    restaurantId: string,
  ): Promise<Category[]> {
    return this.categoriesService.findAllByRestaurant(restaurantId);
  }

  async updateCategory(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    actor?: User,
    request?: Request,
  ): Promise<Category> {
    return this.categoriesService.update(id, updateCategoryDto, actor, request);
  }

  async deleteCategory(
    id: string,
    actor?: User,
    request?: Request,
  ): Promise<void> {
    return this.categoriesService.delete(id, actor, request);
  }

  // MenuItem Methods
  async createMenuItem(
    createMenuItemDto: CreateMenuItemDto,
    actor?: User,
    request?: Request,
  ): Promise<MenuItem> {
    return this.menuItemsService.create(createMenuItemDto, actor, request);
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
    actor?: User,
    request?: Request,
  ): Promise<MenuItem> {
    return this.menuItemsService.update(id, updateMenuItemDto, actor, request);
  }

  async deleteMenuItem(
    id: string,
    actor?: User,
    request?: Request,
  ): Promise<void> {
    return this.menuItemsService.delete(id, actor, request);
  }

  async findMenuItemById(id: string): Promise<MenuItemResponseDto> {
    return this.menuItemsService.findById(id);
  }

  async findBranchMenuItemById(
    branchId: string,
    menuItemId: string,
  ): Promise<MenuItemResponseDto> {
    const item = await this.menuItemQueryService.findBranchItemById(
      branchId,
      menuItemId,
    );
    if (!item) {
      throw new NotFoundException(`MenuItem #${menuItemId} not found`);
    }
    return item;
  }

  async upsertBranchMenuOverride(
    branchId: string,
    menuItemId: string,
    dto: UpsertBranchMenuOverrideDto,
    user?: User,
    request?: Request,
  ): Promise<BranchMenuOverride> {
    return this.branchMenuOverridesService.upsert(
      branchId,
      menuItemId,
      dto,
      user,
      request,
    );
  }

  async bulkBranchMenuOverrides(
    branchId: string,
    dto: BulkBranchMenuOverridesDto,
    user?: User,
    request?: Request,
  ): Promise<BulkBranchMenuOverridesResult> {
    return this.branchMenuOverridesService.applyBulk(
      branchId,
      dto,
      user,
      request,
    );
  }

  async deleteBranchMenuOverride(
    branchId: string,
    menuItemId: string,
    user?: User,
    request?: Request,
  ): Promise<void> {
    return this.branchMenuOverridesService.remove(
      branchId,
      menuItemId,
      user,
      request,
    );
  }

  async getBranchItemsForManagement(
    branchId: string,
    queryDto: GetBranchMenuItemsDto,
  ): Promise<NormalizedPaginatedResult<MenuItemResponseDto>> {
    return this.menuItemQueryService.findBranchItemsForManagement(
      branchId,
      queryDto,
    );
  }

  async getBranchCategories(
    branchId: string,
    queryDto: GetBranchCategoriesDto,
    user: User,
  ): Promise<BranchCategoryView[]> {
    return this.branchCategoryOverridesService.getBranchCategories(
      branchId,
      Boolean(queryDto.includeStats),
      user,
    );
  }

  async excludeCategory(
    branchId: string,
    categoryId: string,
    user: User,
    request?: Request,
  ): Promise<{ affectedProducts: number }> {
    return this.branchCategoryOverridesService.excludeCategory(
      branchId,
      categoryId,
      user,
      request,
    );
  }

  async includeCategory(
    branchId: string,
    categoryId: string,
    user: User,
    request?: Request,
  ): Promise<{ affectedProducts: number }> {
    return this.branchCategoryOverridesService.includeCategory(
      branchId,
      categoryId,
      user,
      request,
    );
  }

  async excludeAllCategories(
    branchId: string,
    user: User,
    categoryIds?: string[],
    request?: Request,
  ): Promise<{ affectedCategories: number; affectedProducts: number }> {
    return this.branchCategoryOverridesService.excludeAllCategories(
      branchId,
      user,
      categoryIds,
      request,
    );
  }

  async includeAllCategories(
    branchId: string,
    user: User,
    categoryIds?: string[],
    request?: Request,
  ): Promise<{ affectedCategories: number; affectedProducts: number }> {
    return this.branchCategoryOverridesService.includeAllCategories(
      branchId,
      user,
      categoryIds,
      request,
    );
  }
}
