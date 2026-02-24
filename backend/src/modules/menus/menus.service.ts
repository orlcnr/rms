import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Category } from './entities/category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { Recipe } from '../inventory/entities/recipe.entity';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { InventoryService } from '../inventory/inventory.service';
import { RulesService } from '../rules/rules.service';
import { RuleKey } from '../rules/enums/rule-key.enum';
import { OrderItem } from '../orders/entities/order-item.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import { GetMenuItemsDto } from './dto/get-menu-items.dto';
import { MenuItemResponseDto } from './dto/menu-item-response.dto';

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    private readonly inventoryService: InventoryService,
    private readonly rulesService: RulesService,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  private async clearCache(restaurantId: string) {
    const cacheKey = `menus:categories:${restaurantId}`;
    await this.cacheManager.del(cacheKey);
  }

  // Category Methods
  async createCategory(
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryDto);
    const saved = await this.categoryRepository.save(category);
    await this.clearCache(createCategoryDto.restaurant_id);
    return saved;
  }

  async findAllCategoriesByRestaurant(
    restaurantId: string,
  ): Promise<Category[]> {
    const cacheKey = `menus:categories:${restaurantId}`;
    const cachedData = await this.cacheManager.get<Category[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const categories = await this.categoryRepository.find({
      where: { restaurant_id: restaurantId },
      relations: ['items', 'items.recipes', 'items.recipes.ingredient'],
    });

    await this.cacheManager.set(cacheKey, categories);
    return categories;
  }

  async updateCategory(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.categoryRepository.preload({
      id,
      ...updateCategoryDto,
    });
    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }
    const saved = await this.categoryRepository.save(category);
    await this.clearCache(saved.restaurant_id);
    return saved;
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }
    await this.categoryRepository.delete(id);
    await this.clearCache(category.restaurant_id);
  }

  // MenuItem Methods
  async createMenuItem(
    createMenuItemDto: CreateMenuItemDto,
  ): Promise<MenuItem> {
    const { recipes, ...itemData } = createMenuItemDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const menuItem = this.menuItemRepository.create(itemData);
      const savedItem = await queryRunner.manager.save(menuItem);

      if (itemData.track_inventory && recipes && recipes.length > 0) {
        const recipeEntities = recipes.map((r) =>
          this.dataSource.getRepository(Recipe).create({
            product_id: savedItem.id,
            ingredient_id: r.ingredient_id,
            quantity: r.quantity,
          }),
        );
        await queryRunner.manager.save(Recipe, recipeEntities);
      }

      await queryRunner.commitTransaction();

      // Clear cache
      const category = await this.categoryRepository.findOne({
        where: { id: itemData.category_id },
      });
      if (category) await this.clearCache(category.restaurant_id);

      return savedItem;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllMenuItemsByCategory(categoryId: string): Promise<MenuItem[]> {
    return this.menuItemRepository.find({
      where: { category_id: categoryId },
      relations: ['recipes', 'recipes.ingredient'],
    });
  }

  async findAllMenuItemsByRestaurant(
    restaurantId: string,
    queryDto: GetMenuItemsDto,
  ): Promise<Pagination<MenuItemResponseDto>> {
    const { page = 1, limit = 10, search, categoryId, stockStatus, salesStatus, minPrice, maxPrice, posMode } = queryDto;

    const queryBuilder = this.menuItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.recipes', 'recipes')
      .leftJoinAndSelect('recipes.ingredient', 'ingredient')
      .leftJoinAndSelect('ingredient.stock', 'stock')
      .where('category.restaurant_id = :restaurantId', { restaurantId });

    if (search) {
      queryBuilder.andWhere(
        '(item.name ILIKE :search OR item.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId && categoryId !== 'all') {
      queryBuilder.andWhere('item.category_id = :categoryId', { categoryId });
    }

    // POS Mode: Automatic stock-based filtering
    // - track_inventory=true products: only show if stock > 0
    // - track_inventory=false or NULL products: show if is_available=true
    if (posMode) {
      queryBuilder.andWhere(
        '((item.track_inventory = true AND stock.quantity > 0) OR item.track_inventory = false OR item.track_inventory IS NULL OR stock IS NULL)'
      );
      // Also ensure is_available = true in POS mode
      queryBuilder.andWhere('item.is_available = :isAvailable', { isAvailable: true });
    }

    // Stock Status Filter (only applied when not in POS mode)
    if (!posMode && stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'out_of_stock') {
        // No stock records or zero quantity
        queryBuilder.andWhere(
          '(stock IS NULL OR stock.quantity <= 0)'
        );
      } else if (stockStatus === 'critical') {
        // Has stock but below critical level
        queryBuilder.andWhere(
          'stock.quantity > 0 AND stock.quantity <= ingredient.critical_level'
        );
      } else if (stockStatus === 'in_stock') {
        // Has stock above critical level
        queryBuilder.andWhere(
          'stock.quantity > COALESCE(ingredient.critical_level, 0)'
        );
      }
    }

    // Sales Status Filter
    if (salesStatus && salesStatus !== 'all') {
      if (salesStatus === 'active') {
        queryBuilder.andWhere('item.is_available = :isAvailable', { isAvailable: true });
      } else if (salesStatus === 'inactive') {
        queryBuilder.andWhere('item.is_available = :isAvailable', { isAvailable: false });
      }
    }

    // Price Range Filter
    if (minPrice !== undefined && minPrice !== null) {
      queryBuilder.andWhere('item.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined && maxPrice !== null) {
      queryBuilder.andWhere('item.price <= :maxPrice', { maxPrice });
    }

    queryBuilder.orderBy('item.name', 'ASC');

    const paginationResult = await paginate<MenuItem>(queryBuilder, {
      page,
      limit,
    });

    return new Pagination(
      paginationResult.items.map((item) => MenuItemResponseDto.fromEntity(item)),
      paginationResult.meta,
      paginationResult.links,
    );
  }

  async updateMenuItem(
    id: string,
    updateMenuItemDto: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    const { recipes, ...itemData } = updateMenuItemDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingItem = await this.menuItemRepository.findOne({
        where: { id },
        relations: ['category'],
      });
      if (!existingItem) {
        throw new NotFoundException(`MenuItem #${id} not found`);
      }

      Object.assign(existingItem, itemData);
      const savedItem = await queryRunner.manager.save(existingItem);

      // Reçeteleri güncelle (eskileri sil, yenileri ekle)
      await queryRunner.manager.delete(Recipe, { product_id: id });

      if (itemData.track_inventory && recipes && recipes.length > 0) {
        const recipeEntities = recipes.map((r) =>
          this.dataSource.getRepository(Recipe).create({
            product_id: id,
            ingredient_id: r.ingredient_id,
            quantity: r.quantity,
          }),
        );
        await queryRunner.manager.save(Recipe, recipeEntities);
      }

      await queryRunner.commitTransaction();

      // Clear cache for current category's restaurant
      await this.clearCache(existingItem.category.restaurant_id);

      return savedItem;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteMenuItem(id: string): Promise<void> {
    const item = await this.menuItemRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!item) {
      throw new NotFoundException(`MenuItem #${id} not found`);
    }

    // Business Rule Check: Aktif siparişlerde kullanılan ürünlerin silinmesini engelle
    await this.rulesService.checkRule(
      item.category.restaurant_id,
      RuleKey.MENU_PREVENT_DELETE_ITEM,
      id,
      'Bu ürün silinemez: Aktif siparişlerde kullanılmıştır.'
    );

    await this.menuItemRepository.delete(id);
    await this.clearCache(item.category.restaurant_id);
  }

  async findMenuItemById(id: string): Promise<MenuItem> {
    const item = await this.menuItemRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!item) {
      throw new NotFoundException(`MenuItem #${id} not found`);
    }

    // Reçeteleri ve malzeme bilgilerini getir
    const recipes = await this.dataSource.getRepository(Recipe).find({
      where: { product_id: id },
    });

    const ingredientRepo = this.dataSource.getRepository(Ingredient);

    const recipesWithIngredients = await Promise.all(
      recipes.map(async (r) => {
        const ingredient = await ingredientRepo.findOne({
          where: { id: r.ingredient_id },
        });
        return {
          ...r,
          // Ensure quantity is a plain number, not a string or decimal object
          quantity: Number(r.quantity),
          ingredient: ingredient
            ? { name: ingredient.name, unit: ingredient.unit }
            : null,
        };
      }),
    );

    // Image URL'i dönüştür
    if (item.image_url) {
      // Use the same domain logic as the DTO
      const domain = process.env.FILE_DOMAIN || 'https://api.localhost';
      if (!item.image_url.startsWith('http')) {
        item.image_url = `${domain}${item.image_url.startsWith('/') ? '' : '/'}${item.image_url}`;
      }
    }

    return {
      ...item,
      recipes: recipesWithIngredients,
    } as MenuItem;
  }
}
