import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import { Ingredient } from '../entities/ingredient.entity';
import { Stock } from '../entities/stock.entity';
import { BranchStock } from '../entities/branch-stock.entity';
import { BranchIngredientCost } from '../entities/branch-ingredient-cost.entity';
import { Recipe } from '../entities/recipe.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { GetIngredientsDto } from '../dto/get-ingredients.dto';
import { GetStockMovementsDto } from '../dto/get-stock-movements.dto';
import { IngredientRepository } from '../repositories/ingredient.repository';
import { BranchStockRepository } from '../repositories/branch-stock.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import { IngredientQueryFactory } from '../query/factories/ingredient-query.factory';
import { MovementQueryFactory } from '../query/factories/movement-query.factory';
import { IngredientMapper } from '../mappers/ingredient.mapper';
import type { User } from '../../users/entities/user.entity';
import { InventoryAuthorizationService } from './inventory-authorization.service';

type InventoryRequest = {
  user: {
    restaurantId: string;
  };
};

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

@Injectable()
export class InventoryQueryService {
  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(BranchStock)
    private readonly branchStockRepository: Repository<BranchStock>,
    @InjectRepository(BranchIngredientCost)
    private readonly branchIngredientCostRepository: Repository<BranchIngredientCost>,
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    private readonly inventoryIngredientRepository: IngredientRepository,
    private readonly inventoryBranchStockRepository: BranchStockRepository,
    private readonly inventoryStockMovementRepository: StockMovementRepository,
    private readonly ingredientQueryFactory: IngredientQueryFactory,
    private readonly movementQueryFactory: MovementQueryFactory,
    private readonly inventoryAuthorizationService: InventoryAuthorizationService,
  ) {}

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

  async findAllIngredients(
    req: InventoryRequest,
    filters: GetIngredientsDto,
  ): Promise<Pagination<Ingredient>> {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID is required');
    }

    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
      select: ['id', 'brand_id'],
    });
    const brandId = restaurant?.brand_id || null;

    const quantityExpr = brandId
      ? `COALESCE((SELECT bs.quantity FROM operations.branch_stocks bs
          WHERE bs.ingredient_id = ingredient.id
          AND bs.branch_id = :restaurantId), 0)`
      : `COALESCE((SELECT bs.quantity FROM operations.branch_stocks bs
          WHERE bs.ingredient_id = ingredient.id
          AND bs.branch_id = :restaurantId), COALESCE(stock.quantity, 0))`;

    const queryBuilder =
      this.inventoryIngredientRepository.createFindAllQuery(restaurantId);
    queryBuilder.setParameter('restaurantId', restaurantId);
    const specs = this.ingredientQueryFactory.create(filters, {
      restaurantId,
      brandId,
      quantityExpr,
    });

    for (const spec of specs) {
      spec.apply(queryBuilder);
    }

    queryBuilder.orderBy('ingredient.name', 'ASC');

    const paginated = await paginate<Ingredient>(queryBuilder, {
      page: filters.page ?? 1,
      limit: filters.limit ?? 10,
    });

    const ingredientIds = paginated.items.map((item) => item.id);
    if (ingredientIds.length) {
      const [branchStockMap, branchCostMap] = await Promise.all([
        this.inventoryBranchStockRepository.findByBranchAndIngredients(
          restaurantId,
          ingredientIds,
        ),
        this.getBranchCostMap(restaurantId, ingredientIds),
      ]);

      for (const item of paginated.items) {
        IngredientMapper.toResponse({
          ingredient: item,
          branchStock: branchStockMap.get(item.id),
          branchCost: branchCostMap.get(item.id),
          forceBranchStock: Boolean(brandId),
        });
      }
    }

    return paginated;
  }

  async findOneIngredient(
    id: string,
    requesterRestaurantId?: string,
  ): Promise<Ingredient> {
    const requesterRestaurant = requesterRestaurantId
      ? await this.restaurantRepository.findOne({
          where: { id: requesterRestaurantId },
          select: ['id', 'brand_id'],
        })
      : null;

    const ingredient = await this.inventoryIngredientRepository.findOneInScope({
      id,
      restaurantId: requesterRestaurant?.id,
      brandId: requesterRestaurant?.brand_id,
    });

    if (!ingredient) {
      throw new NotFoundException('Malzeme bulunamadı');
    }

    if (requesterRestaurant) {
      const [branchStock, branchCost] = await Promise.all([
        this.branchStockRepository.findOne({
          where: { ingredient_id: id, branch_id: requesterRestaurant.id },
        }),
        this.branchIngredientCostRepository.findOne({
          where: { ingredient_id: id, branch_id: requesterRestaurant.id },
        }),
      ]);

      IngredientMapper.toResponse({
        ingredient,
        branchStock: branchStock || undefined,
        branchCost: branchCost || undefined,
        forceBranchStock: Boolean(requesterRestaurant.brand_id),
      });
    }

    return ingredient;
  }

  async getStocks(
    restaurantId: string,
    page: number = 1,
    limit: number = 10,
    actor?: User,
  ): Promise<PaginatedArrayResult<Stock>> {
    if (actor) {
      await this.inventoryAuthorizationService.assertRestaurantScopeAccess(
        actor,
        restaurantId,
      );
    }

    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
    const offset = (safePage - 1) * safeLimit;

    const qb = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.ingredient', 'ingredient')
      .where('ingredient.restaurant_id = :restaurantId', { restaurantId })
      .orderBy('ingredient.name', 'ASC');

    const [items, totalItems] = await qb
      .skip(offset)
      .take(safeLimit)
      .getManyAndCount();

    return {
      items,
      meta: {
        currentPage: safePage,
        itemsPerPage: safeLimit,
        itemCount: items.length,
        totalItems,
        totalPages: Math.ceil(totalItems / safeLimit),
      },
    };
  }

  async getBranchStocks(
    branchId: string,
    page: number = 1,
    limit: number = 10,
    actor?: User,
  ): Promise<PaginatedArrayResult<BranchStock>> {
    if (actor) {
      await this.inventoryAuthorizationService.assertRestaurantScopeAccess(
        actor,
        branchId,
      );
    }

    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
    const offset = (safePage - 1) * safeLimit;

    const qb = this.branchStockRepository
      .createQueryBuilder('branchStock')
      .leftJoinAndSelect('branchStock.ingredient', 'ingredient')
      .where('branchStock.branch_id = :branchId', { branchId })
      .orderBy('ingredient.name', 'ASC');

    const [items, totalItems] = await qb
      .skip(offset)
      .take(safeLimit)
      .getManyAndCount();

    return {
      items,
      meta: {
        currentPage: safePage,
        itemsPerPage: safeLimit,
        itemCount: items.length,
        totalItems,
        totalPages: Math.ceil(totalItems / safeLimit),
      },
    };
  }

  async getSummary(
    restaurantId: string,
  ): Promise<{ criticalStockCount: number }> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
      select: ['id', 'brand_id'],
    });
    const brandId = restaurant?.brand_id || null;
    const quantityExpr = brandId
      ? 'COALESCE(branch_stock.quantity, 0)'
      : 'COALESCE(branch_stock.quantity, COALESCE(stock.quantity, 0))';

    const raw = (await this.ingredientRepository
      .createQueryBuilder('ingredient')
      .leftJoin('ingredient.stock', 'stock')
      .leftJoin(
        BranchStock,
        'branch_stock',
        'branch_stock.ingredient_id = ingredient.id AND branch_stock.branch_id = :restaurantId',
        { restaurantId },
      )
      .select('COUNT(*)', 'critical_stock_count')
      .where(
        brandId
          ? 'ingredient.brand_id = :brandId'
          : 'ingredient.restaurant_id = :restaurantId',
        brandId ? { brandId } : { restaurantId },
      )
      .andWhere('ingredient.critical_level > 0')
      .andWhere(`${quantityExpr} > 0`)
      .andWhere(`${quantityExpr} <= ingredient.critical_level`)
      .getRawOne()) as { critical_stock_count?: string | number } | null;

    return {
      criticalStockCount: Number(raw?.critical_stock_count || 0),
    };
  }

  async findAllMovements(
    req: InventoryRequest,
    filters: GetStockMovementsDto,
  ): Promise<Pagination<StockMovement>> {
    const restaurantId = req.user.restaurantId;
    const query = this.inventoryStockMovementRepository.createBaseQuery();
    const specs = this.movementQueryFactory.create(filters, {
      branchId: restaurantId,
    });
    for (const spec of specs) {
      spec.apply(query);
    }
    query.orderBy('movement.created_at', 'DESC');

    return paginate<StockMovement>(query, {
      page: filters.page ?? 1,
      limit: filters.limit ?? 10,
    });
  }

  async findAllMovementsForExport(
    req: InventoryRequest,
    queryDto: GetStockMovementsDto,
  ): Promise<StockMovement[]> {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID is required');
    }
    const query = this.inventoryStockMovementRepository.createBaseQuery();
    const specs = this.movementQueryFactory.create(queryDto, {
      branchId: restaurantId,
    });
    for (const spec of specs) {
      spec.apply(query);
    }

    return query.orderBy('movement.created_at', 'DESC').getMany();
  }

  async getIngredientUsage(ingredientId: string, restaurantId: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
      select: ['id', 'brand_id'],
    });

    if (!restaurant) {
      throw new NotFoundException('Şube bulunamadı');
    }

    const ingredient = restaurant.brand_id
      ? await this.ingredientRepository.findOne({
          where: { id: ingredientId, brand_id: restaurant.brand_id },
        })
      : await this.ingredientRepository.findOne({
          where: { id: ingredientId, restaurant_id: restaurantId },
        });

    if (!ingredient) {
      throw new NotFoundException('Malzeme bulunamadı');
    }

    const recipes = await this.recipeRepository
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .where('recipe.ingredient_id = :ingredientId', { ingredientId })
      .getMany();

    const products = recipes.map((recipe) => ({
      product_id: recipe.product.id,
      product_name: recipe.product.name,
      quantity: Number(recipe.quantity),
      product_price: Number(recipe.product.price),
    }));

    return {
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
      },
      products,
      total_products_affected: products.length,
    };
  }

  async getProductRecipe(productId: string): Promise<Recipe[]> {
    return this.recipeRepository.find({
      where: { product_id: productId },
      relations: ['ingredient'],
    });
  }
}
