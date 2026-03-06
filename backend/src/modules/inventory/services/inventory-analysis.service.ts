import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsService } from '../../settings/settings.service';
import { BranchIngredientCost } from '../entities/branch-ingredient-cost.entity';
import { MovementType, StockMovement } from '../entities/stock-movement.entity';
import { MenuItem } from '../../menus/entities/menu-item.entity';
import { Recipe } from '../entities/recipe.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { FoodCostSnapshotRepository } from '../repositories/food-cost-snapshot.repository';

type PaginationMeta = {
  currentPage: number;
  itemsPerPage: number;
  itemCount: number;
  totalItems: number;
  totalPages: number;
};

type PaginatedArrayResult<T> = {
  items: T[];
  meta: PaginationMeta;
};

type FoodCostAlertItem = {
  product_id: string;
  product_name: string;
  current_price: number;
  recipe_cost: number;
  food_cost_percent: number;
  suggested_price: number;
};

const FOOD_COST_ALERT_THRESHOLD_KEY = 'food_cost_alert_threshold_percent';
const DEFAULT_FOOD_COST_THRESHOLD = 35;
const ISTANBUL_TIMEZONE = 'Europe/Istanbul';

@Injectable()
export class InventoryAnalysisService {
  private readonly logger = new Logger(InventoryAnalysisService.name);

  constructor(
    @InjectRepository(BranchIngredientCost)
    private readonly branchIngredientCostRepository: Repository<BranchIngredientCost>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    private readonly settingsService: SettingsService,
    private readonly foodCostSnapshotRepository: FoodCostSnapshotRepository,
  ) {}

  private paginateArray<T>(
    source: T[],
    page: number = 1,
    limit: number = 10,
  ): PaginatedArrayResult<T> {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
    const totalItems = source.length;
    const totalPages = safeLimit > 0 ? Math.ceil(totalItems / safeLimit) : 0;
    const offset = (safePage - 1) * safeLimit;
    const items = source.slice(offset, offset + safeLimit);

    return {
      items,
      meta: {
        currentPage: safePage,
        itemsPerPage: safeLimit,
        itemCount: items.length,
        totalItems,
        totalPages,
      },
    };
  }

  private getTodayDateInIstanbul(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ISTANBUL_TIMEZONE,
    }).format(new Date());
  }

  private async resolveFoodCostThreshold(
    restaurantId: string,
  ): Promise<number> {
    const rawThreshold = await this.settingsService.getSetting(
      restaurantId,
      FOOD_COST_ALERT_THRESHOLD_KEY,
      DEFAULT_FOOD_COST_THRESHOLD,
    );

    const parsedThreshold = Number(rawThreshold);
    return Number.isFinite(parsedThreshold) && parsedThreshold > 0
      ? parsedThreshold
      : DEFAULT_FOOD_COST_THRESHOLD;
  }

  private async getBranchCostMap(
    branchId: string,
    ingredientIds: string[],
  ): Promise<Map<string, BranchIngredientCost>> {
    if (!ingredientIds.length) {
      return new Map();
    }

    const rows = await this.branchIngredientCostRepository
      .createQueryBuilder('branch_cost')
      .where('branch_cost.branch_id = :branchId', { branchId })
      .andWhere('branch_cost.ingredient_id IN (:...ingredientIds)', {
        ingredientIds,
      })
      .getMany();

    return new Map(rows.map((row) => [row.ingredient_id, row]));
  }

  async calculateCostImpact(
    restaurantId: string,
    days: number = 7,
    page: number = 1,
    limit: number = 10,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
      select: ['id', 'brand_id'],
    });

    if (!restaurant) {
      throw new NotFoundException('Şube bulunamadı');
    }

    const branchCosts = await this.branchIngredientCostRepository
      .createQueryBuilder('branch_cost')
      .innerJoinAndSelect('branch_cost.ingredient', 'ingredient')
      .where('branch_cost.branch_id = :branchId', { branchId: restaurantId })
      .andWhere('branch_cost.price_updated_at >= :startDate', { startDate })
      .andWhere('branch_cost.previous_price IS NOT NULL')
      .andWhere('branch_cost.previous_price != branch_cost.last_price')
      .andWhere(
        restaurant.brand_id
          ? 'ingredient.brand_id = :brandId'
          : 'ingredient.restaurant_id = :restaurantId',
        restaurant.brand_id
          ? { brandId: restaurant.brand_id }
          : { restaurantId },
      )
      .getMany();

    const costImpacts = await Promise.all(
      branchCosts.map(async (branchCost) => {
        const previousPrice = Number(branchCost.previous_price) || 0;
        const currentPrice = Number(branchCost.last_price) || 0;
        const priceChange = currentPrice - previousPrice;

        const monthlyConsumption = await this.movementRepository
          .createQueryBuilder('movement')
          .select(
            'SUM(COALESCE(movement.base_quantity, movement.quantity))',
            'total',
          )
          .where('movement.ingredient_id = :ingredientId', {
            ingredientId: branchCost.ingredient_id,
          })
          .andWhere('movement.branch_id = :branchId', {
            branchId: restaurantId,
          })
          .andWhere('movement.type = :type', { type: MovementType.OUT })
          .andWhere('movement.created_at >= :startDate', {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          })
          .getRawOne<{ total: string | null }>();

        const monthlyQty = Number(monthlyConsumption?.total) || 0;
        const costImpact = priceChange * monthlyQty;

        return {
          ingredient_id: branchCost.ingredient_id,
          ingredient_name: branchCost.ingredient.name,
          unit: branchCost.ingredient.unit,
          previous_price: previousPrice,
          current_price: currentPrice,
          price_change: priceChange,
          price_change_percent:
            previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0,
          monthly_consumption: monthlyQty,
          cost_impact: costImpact,
        };
      }),
    );

    const sorted = costImpacts.sort((a, b) => b.cost_impact - a.cost_impact);
    return this.paginateArray(sorted, page, limit);
  }

  async getCountDifferences(
    restaurantId: string,
    weeks: number = 4,
    page: number = 1,
    limit: number = 10,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const movements = await this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.ingredient', 'ingredient')
      .where('movement.branch_id = :restaurantId', { restaurantId })
      .andWhere('movement.reason LIKE :reason', { reason: '%SAYIM FARKI%' })
      .andWhere('movement.created_at >= :startDate', { startDate })
      .orderBy('movement.created_at', 'DESC')
      .getMany();

    const ingredientIds = Array.from(
      new Set(movements.map((movement) => movement.ingredient_id)),
    );
    const costMap = await this.getBranchCostMap(restaurantId, ingredientIds);

    const mapped = movements.map((movement) => {
      const systemQty = Number(movement.quantity);
      const countedQty =
        movement.type === MovementType.IN ? systemQty : -systemQty;
      const difference =
        movement.type === MovementType.IN ? systemQty : -systemQty;
      const avgCost =
        Number(costMap.get(movement.ingredient_id)?.average_cost ?? 0) || 0;

      return {
        ingredient_id: movement.ingredient_id,
        ingredient_name: movement.ingredient?.name || 'Bilinmiyor',
        count_date: movement.created_at.toISOString(),
        system_quantity: 0,
        counted_quantity: countedQty,
        difference_quantity: difference,
        difference_try: difference * avgCost,
        unit: movement.ingredient?.unit || 'adet',
      };
    });
    return this.paginateArray(mapped, page, limit);
  }

  async computeFoodCostAlerts(
    restaurantId: string,
  ): Promise<FoodCostAlertItem[]> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
      select: ['id', 'brand_id'],
    });
    if (!restaurant) {
      throw new NotFoundException('Şube bulunamadı');
    }

    const foodCostThreshold = await this.resolveFoodCostThreshold(restaurantId);

    const menuQuery = this.menuItemRepository
      .createQueryBuilder('menuItem')
      .andWhere('menuItem.is_available = :isAvailable', { isAvailable: true });

    if (restaurant.brand_id) {
      menuQuery.where(
        '(menuItem.brand_id = :brandId AND menuItem.branch_id IS NULL) OR menuItem.branch_id = :branchId',
        {
          brandId: restaurant.brand_id,
          branchId: restaurant.id,
        },
      );
    } else {
      menuQuery.where('menuItem.restaurant_id = :restaurantId', {
        restaurantId,
      });
    }

    const menuItems = await menuQuery.getMany();

    const alerts: FoodCostAlertItem[] = [];

    for (const menuItem of menuItems) {
      const recipes = await this.recipeRepository
        .createQueryBuilder('recipe')
        .leftJoinAndSelect('recipe.ingredient', 'ingredient')
        .where('"recipe"."product_id" = :productId', { productId: menuItem.id })
        .getMany();

      if (!recipes.length) {
        continue;
      }

      const ingredientIds = Array.from(
        new Set(recipes.map((r) => r.ingredient_id)),
      );
      const costMap = await this.getBranchCostMap(restaurantId, ingredientIds);

      let recipeCost = 0;
      for (const recipe of recipes) {
        if (recipe.ingredient_id) {
          const ingredientCost =
            Number(costMap.get(recipe.ingredient_id)?.average_cost ?? 0) || 0;
          recipeCost += ingredientCost * Number(recipe.quantity);
        }
      }

      const productPrice = Number(menuItem.price);
      const foodCostPercent =
        productPrice > 0 ? (recipeCost / productPrice) * 100 : 0;

      if (foodCostPercent > foodCostThreshold) {
        const suggestedPrice = recipeCost / (foodCostThreshold / 100);
        alerts.push({
          product_id: menuItem.id,
          product_name: menuItem.name,
          current_price: productPrice,
          recipe_cost: recipeCost,
          food_cost_percent: Math.round(foodCostPercent * 100) / 100,
          suggested_price: Math.round(suggestedPrice * 100) / 100,
        });
      }
    }

    return alerts.sort((a, b) => b.food_cost_percent - a.food_cost_percent);
  }

  async getFoodCostAlertsFromSnapshot(
    restaurantId: string,
    options?: {
      page?: number;
      limit?: number;
      refresh?: boolean;
    },
  ): Promise<PaginatedArrayResult<FoodCostAlertItem>> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const refresh = options?.refresh ?? false;
    const today = this.getTodayDateInIstanbul();

    if (!refresh) {
      let snapshot = await this.foodCostSnapshotRepository.findByBranchAndDate(
        restaurantId,
        today,
      );

      if (!snapshot) {
        const hasAnySnapshot =
          await this.foodCostSnapshotRepository.hasAnySnapshotForDate(today);

        if (!hasAnySnapshot) {
          await this.runDailyFoodCostSnapshotCron();
          snapshot = await this.foodCostSnapshotRepository.findByBranchAndDate(
            restaurantId,
            today,
          );
        }
      }

      if (snapshot) {
        return this.paginateArray(snapshot.alerts || [], page, limit);
      }
    }

    const computedAlerts = await this.computeFoodCostAlerts(restaurantId);

    await this.foodCostSnapshotRepository.upsertSnapshot({
      branchId: restaurantId,
      snapshotDate: today,
      alerts: computedAlerts,
      computedAt: new Date(),
    });

    return this.paginateArray(computedAlerts, page, limit);
  }

  async runDailyFoodCostSnapshotCron(): Promise<void> {
    const today = this.getTodayDateInIstanbul();
    const activeBranches = await this.restaurantRepository.find({
      where: { is_active: true },
      select: ['id'],
    });

    for (const branch of activeBranches) {
      try {
        const alerts = await this.computeFoodCostAlerts(branch.id);
        await this.foodCostSnapshotRepository.upsertSnapshot({
          branchId: branch.id,
          snapshotDate: today,
          alerts,
          computedAt: new Date(),
        });
      } catch (error) {
        this.logger.error(
          `Food-cost snapshot failed for branch ${branch.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  async getFoodCostAlerts(
    restaurantId: string,
    page: number = 1,
    limit: number = 10,
    refresh: boolean = false,
  ) {
    return this.getFoodCostAlertsFromSnapshot(restaurantId, {
      page,
      limit,
      refresh,
    });
  }
}
