import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Ingredient } from '../entities/ingredient.entity';
import { Stock } from '../entities/stock.entity';
import { BranchStock } from '../entities/branch-stock.entity';
import { BranchIngredientCost } from '../entities/branch-ingredient-cost.entity';
import { Recipe } from '../entities/recipe.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { CreateIngredientDto } from '../dto/create-ingredient.dto';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateIngredientDto } from '../dto/update-ingredient.dto';
import { Order } from '../../orders/entities/order.entity';
import { RulesService } from '../../rules/rules.service';
import { RuleKey } from '../../rules/enums/rule-key.enum';
import type { User } from '../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';
import { DeductBranchStockUseCase } from '../use-cases/deduct-branch-stock.use-case';
import { InitBranchStockUseCase } from '../use-cases/init-branch-stock.use-case';
import { InitBranchCostUseCase } from '../use-cases/init-branch-cost.use-case';
import {
  assertSameGroup,
  getUnitGroup,
  normalizeBaseUnit,
  toBaseUnit,
} from '../utils/unit-converter';
import { InventoryEventFactory } from '../events/inventory-event.factory';
import { InventoryEventPublisher } from '../publishers/inventory-event.publisher';
import { IngredientMapper } from '../mappers/ingredient.mapper';
import { InventoryQueryService } from './inventory-query.service';
import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
import { StockMovement } from '../entities/stock-movement.entity';
import { CreateStockMovementUseCase } from '../use-cases/create-stock-movement.use-case';

@Injectable()
export class InventoryCommandService {
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
    private readonly rulesService: RulesService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly deductBranchStockUseCase: DeductBranchStockUseCase,
    private readonly initBranchStockUseCase: InitBranchStockUseCase,
    private readonly initBranchCostUseCase: InitBranchCostUseCase,
    private readonly eventFactory: InventoryEventFactory,
    private readonly eventPublisher: InventoryEventPublisher,
    private readonly inventoryQueryService: InventoryQueryService,
    private readonly createStockMovementUseCase: CreateStockMovementUseCase,
  ) {}

  private buildActorName(actor?: User): string | undefined {
    if (!actor?.first_name) {
      return undefined;
    }
    return `${actor.first_name} ${actor.last_name || ''}`.trim();
  }

  private async emitDomainAudit(params: {
    action: AuditAction;
    restaurantId?: string;
    payload?: Record<string, unknown>;
    changes?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      meta?: Record<string, unknown>;
    };
    actor?: User;
    request?: Request;
    context: string;
  }): Promise<void> {
    const headerUserAgent = params.request?.headers?.['user-agent'];
    const userAgent =
      typeof headerUserAgent === 'string'
        ? headerUserAgent
        : headerUserAgent?.[0];

    await this.auditService.safeEmitLog(
      {
        action: params.action,
        resource: 'INVENTORY',
        user_id: params.actor?.id,
        user_name: this.buildActorName(params.actor),
        restaurant_id: params.restaurantId,
        payload: params.payload,
        changes: params.changes,
        ip_address: params.request?.ip,
        user_agent: userAgent,
      },
      params.context,
    );
    this.auditService.markRequestAsAudited(
      params.request as unknown as Record<string, unknown>,
    );
  }

  async createIngredient(
    createIngredientDto: CreateIngredientDto,
    actor?: User,
    request?: Request,
  ): Promise<Ingredient> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const actorRestaurantId = actor?.restaurant_id;
      if (!actorRestaurantId) {
        throw new BadRequestException('Restaurant ID is required');
      }
      const actorRestaurant = await queryRunner.manager.findOne(Restaurant, {
        where: { id: actorRestaurantId },
        select: ['id', 'brand_id'],
      });

      const resolvedBrandId = actorRestaurant?.brand_id || null;
      if (!resolvedBrandId) {
        throw new BadRequestException('Brand ID çözümlenemedi');
      }

      const normalizedBaseUnit = normalizeBaseUnit(createIngredientDto.unit);
      const normalizedUnitGroup = getUnitGroup(createIngredientDto.unit);
      const packSize = createIngredientDto.pack_size ?? 1;

      const ingredient = this.ingredientRepository.create({
        ...createIngredientDto,
        brand_id: resolvedBrandId,
        restaurant_id: actorRestaurantId,
        base_unit: normalizedBaseUnit,
        unit_group: normalizedUnitGroup,
        pack_size: packSize,
      });
      const savedIngredient = await queryRunner.manager.save(ingredient);

      await queryRunner.manager.save(Stock, {
        ingredient_id: savedIngredient.id,
        quantity: 0,
      });

      await queryRunner.manager.query(
        `
        INSERT INTO operations.branch_stocks (ingredient_id, branch_id, quantity)
        SELECT $1, r.id, 0
        FROM business.restaurants r
        WHERE r.brand_id = $2
        ON CONFLICT (ingredient_id, branch_id) DO NOTHING
        `,
        [savedIngredient.id, resolvedBrandId],
      );

      await queryRunner.manager.query(
        `
        INSERT INTO operations.branch_ingredient_costs (
          ingredient_id,
          branch_id,
          average_cost,
          last_price,
          previous_price,
          price_updated_at
        )
        SELECT $1, r.id, NULL, NULL, NULL, NULL
        FROM business.restaurants r
        WHERE r.brand_id = $2
        ON CONFLICT (ingredient_id, branch_id) DO NOTHING
        `,
        [savedIngredient.id, resolvedBrandId],
      );

      await queryRunner.commitTransaction();
      const ingredientCreatedEvent =
        this.eventFactory.createIngredientCreatedEvent({
          brandId: resolvedBrandId,
          actorId: actor?.id,
          payload: {
            ingredientId: savedIngredient.id,
            name: savedIngredient.name,
            baseUnit: savedIngredient.base_unit,
          },
        });
      await this.eventPublisher.publish(
        ingredientCreatedEvent,
        savedIngredient.id,
      );
      await this.emitDomainAudit({
        action: AuditAction.INVENTORY_INGREDIENT_CREATED,
        restaurantId: savedIngredient.restaurant_id || actorRestaurantId,
        payload: { ingredientId: savedIngredient.id },
        changes: sanitizeAuditChanges({
          after: {
            id: savedIngredient.id,
            name: savedIngredient.name,
            unit: savedIngredient.unit,
            critical_level: savedIngredient.critical_level,
          },
        }),
        actor,
        request,
        context: 'InventoryCommandService.createIngredient',
      });
      return savedIngredient;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async addStockMovement(
    dto: CreateStockMovementDto,
    actor?: User,
    request?: Request,
  ): Promise<StockMovement> {
    return this.createStockMovementUseCase.execute(dto, actor, request);
  }

  async createRecipe(
    dto: CreateRecipeDto,
    actor?: User,
    request?: Request,
  ): Promise<Recipe> {
    const ingredient = await this.ingredientRepository.findOne({
      where: { id: dto.ingredient_id },
    });
    if (!ingredient) {
      throw new NotFoundException('Malzeme bulunamadı');
    }

    assertSameGroup(ingredient.base_unit || ingredient.unit, dto.unit);
    const baseQuantity = toBaseUnit(
      dto.quantity,
      dto.unit,
      Number(ingredient.pack_size) || 1,
    );

    const recipe = this.recipeRepository.create({
      ...dto,
      quantity: baseQuantity,
    });
    const savedRecipe = await this.recipeRepository.save(recipe);
    await this.emitDomainAudit({
      action: AuditAction.INVENTORY_RECIPE_CREATED,
      restaurantId: actor?.restaurant_id,
      payload: { recipeId: savedRecipe.id, productId: savedRecipe.product_id },
      changes: sanitizeAuditChanges({
        after: {
          id: savedRecipe.id,
          ingredient_id: savedRecipe.ingredient_id,
          quantity: Number(savedRecipe.quantity),
        },
      }),
      actor,
      request,
      context: 'InventoryCommandService.createRecipe',
    });
    return savedRecipe;
  }

  async updateIngredient(
    id: string,
    dto: UpdateIngredientDto,
    actor?: User,
    request?: Request,
  ): Promise<Ingredient> {
    const ingredient = await this.inventoryQueryService.findOneIngredient(
      id,
      actor?.restaurant_id,
    );
    const beforeSnapshot = {
      name: ingredient.name,
      unit: ingredient.unit,
      critical_level: ingredient.critical_level,
      average_cost: ingredient.average_cost,
      last_price: ingredient.last_price,
      previous_price: ingredient.previous_price,
      price_updated_at: ingredient.price_updated_at,
    };
    const {
      average_cost,
      last_price,
      previous_price,
      price_updated_at,
      ...ingredientFields
    } = dto;

    Object.assign(ingredient, ingredientFields);
    const savedIngredient = await this.ingredientRepository.save(ingredient);

    const hasCostUpdate =
      average_cost !== undefined ||
      last_price !== undefined ||
      previous_price !== undefined ||
      price_updated_at !== undefined;

    if (hasCostUpdate) {
      if (actor?.restaurant_id) {
        const branchCost = await this.branchIngredientCostRepository.findOne({
          where: {
            ingredient_id: id,
            branch_id: actor.restaurant_id,
          },
        });

        const row = branchCost
          ? branchCost
          : this.branchIngredientCostRepository.create({
              ingredient_id: id,
              branch_id: actor.restaurant_id,
            });

        if (average_cost !== undefined) {
          row.average_cost = average_cost;
        }
        if (last_price !== undefined) {
          if (previous_price === undefined) {
            row.previous_price = row.last_price;
          }
          row.last_price = last_price;
        }
        if (previous_price !== undefined) {
          row.previous_price = previous_price;
        }
        row.price_updated_at = price_updated_at
          ? new Date(price_updated_at)
          : last_price !== undefined
            ? new Date()
            : row.price_updated_at;

        const savedBranchCost =
          await this.branchIngredientCostRepository.save(row);
        IngredientMapper.toResponse({
          ingredient: savedIngredient,
          branchCost: savedBranchCost,
        });
      } else {
        if (average_cost !== undefined) {
          savedIngredient.average_cost = average_cost;
        }
        if (last_price !== undefined) {
          if (previous_price === undefined) {
            savedIngredient.previous_price = savedIngredient.last_price;
          }
          savedIngredient.last_price = last_price;
        }
        if (previous_price !== undefined) {
          savedIngredient.previous_price = previous_price;
        }
        savedIngredient.price_updated_at = price_updated_at
          ? new Date(price_updated_at)
          : last_price !== undefined
            ? new Date()
            : savedIngredient.price_updated_at;

        await this.ingredientRepository.save(savedIngredient);
      }
    }

    await this.emitDomainAudit({
      action: AuditAction.INVENTORY_INGREDIENT_UPDATED,
      restaurantId: savedIngredient.restaurant_id,
      payload: { ingredientId: savedIngredient.id },
      changes: sanitizeAuditChanges({
        before: beforeSnapshot,
        after: {
          name: savedIngredient.name,
          unit: savedIngredient.unit,
          critical_level: savedIngredient.critical_level,
          average_cost: savedIngredient.average_cost,
          last_price: savedIngredient.last_price,
          previous_price: savedIngredient.previous_price,
          price_updated_at: savedIngredient.price_updated_at,
        },
      }),
      actor,
      request,
      context: 'InventoryCommandService.updateIngredient',
    });
    return savedIngredient;
  }

  async deleteIngredient(
    id: string,
    actor?: User,
    request?: Request,
  ): Promise<void> {
    const ingredient = await this.inventoryQueryService.findOneIngredient(
      id,
      actor?.restaurant_id,
    );
    const beforeSnapshot = {
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
    };

    await this.rulesService.checkRule(
      ingredient.restaurant_id,
      RuleKey.INVENTORY_PREVENT_DELETE,
      id,
      'Bu malzeme silemezsiniz: Geçmiş işlem kayıtları (stok hareketi) bulunmaktadır.',
    );

    const stock = await this.stockRepository.findOne({
      where: { ingredient_id: id },
    });

    if (stock && stock.quantity > 0) {
      throw new BadRequestException('Mevcut stoğu olan malzemeler silinemez.');
    }

    await this.ingredientRepository.softRemove(ingredient);
    await this.emitDomainAudit({
      action: AuditAction.INVENTORY_INGREDIENT_DELETED,
      restaurantId: ingredient.restaurant_id,
      payload: { ingredientId: ingredient.id },
      changes: sanitizeAuditChanges({
        before: beforeSnapshot,
        after: { deleted: true },
      }),
      actor,
      request,
      context: 'InventoryCommandService.deleteIngredient',
    });
  }

  async deleteRecipe(
    id: string,
    actor?: User,
    request?: Request,
  ): Promise<void> {
    const recipe = await this.recipeRepository.findOne({ where: { id } });
    if (!recipe) {
      throw new NotFoundException('Reçete bulunamadı');
    }
    await this.recipeRepository.delete(id);
    await this.emitDomainAudit({
      action: AuditAction.INVENTORY_RECIPE_DELETED,
      payload: { recipeId: id, productId: recipe.product_id },
      changes: sanitizeAuditChanges({
        before: {
          id: recipe.id,
          ingredient_id: recipe.ingredient_id,
          quantity: Number(recipe.quantity),
        },
        after: { deleted: true },
      }),
      actor,
      request,
      context: 'InventoryCommandService.deleteRecipe',
    });
  }

  async initBranchStocks(
    branchId: string,
    brandId: string,
  ): Promise<{ initializedCount: number }> {
    const initializedCount = await this.initBranchStockUseCase.execute(
      branchId,
      brandId,
    );
    await this.initBranchCostUseCase.execute(branchId, brandId);
    return { initializedCount };
  }

  async initBranchStocksForRequester(
    branchId: string,
    requesterRestaurantId: string,
  ): Promise<{ initializedCount: number }> {
    const requesterRestaurant = await this.restaurantRepository.findOne({
      where: { id: requesterRestaurantId },
      select: ['id', 'brand_id'],
    });
    const targetRestaurant = await this.restaurantRepository.findOne({
      where: { id: branchId },
      select: ['id', 'brand_id'],
    });

    if (!requesterRestaurant?.brand_id || !targetRestaurant?.brand_id) {
      throw new BadRequestException('Brand scope bulunamadı');
    }
    if (requesterRestaurant.brand_id !== targetRestaurant.brand_id) {
      throw new BadRequestException('Farklı brand şubesi için init yapılamaz');
    }
    return this.initBranchStocks(branchId, targetRestaurant.brand_id);
  }

  async decreaseStockForOrder(
    order: Order,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    void _queryRunner;

    const deductItems: Array<{
      ingredientId: string;
      quantity: number;
      unit: string;
      orderId: string;
    }> = [];

    for (const orderItem of order.items) {
      if (!orderItem.menuItem || !orderItem.menuItem.track_inventory) {
        continue;
      }

      const recipes = await this.recipeRepository.find({
        where: { product_id: orderItem.menuItemId },
        relations: ['ingredient'],
      });

      for (const recipe of recipes) {
        deductItems.push({
          ingredientId: recipe.ingredient_id,
          quantity: Number(recipe.quantity) * orderItem.quantity,
          unit: recipe.ingredient?.base_unit || 'adet',
          orderId: order.id,
        });
      }
    }

    if (!deductItems.length) {
      return;
    }

    const orderRestaurant = await this.restaurantRepository.findOne({
      where: { id: order.restaurantId },
      select: ['brand_id'],
    });

    await this.deductBranchStockUseCase.execute(
      order.restaurantId,
      deductItems,
      {
        brandId: orderRestaurant?.brand_id || undefined,
        actorId: order.userId || undefined,
      },
    );
  }
}
