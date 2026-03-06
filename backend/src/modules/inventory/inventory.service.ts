import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { Pagination } from 'nestjs-typeorm-paginate';
import type { QueryRunner } from 'typeorm';
import type { User } from '../users/entities/user.entity';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { GetStockMovementsDto } from './dto/get-stock-movements.dto';
import { GetIngredientsDto } from './dto/get-ingredients.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { Ingredient } from './entities/ingredient.entity';
import { Stock } from './entities/stock.entity';
import { BranchStock } from './entities/branch-stock.entity';
import { Recipe } from './entities/recipe.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Order } from '../orders/entities/order.entity';
import { InventoryQueryService } from './services/inventory-query.service';
import { InventoryCommandService } from './services/inventory-command.service';
import { InventoryAnalysisService } from './services/inventory-analysis.service';

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
export class InventoryService {
  constructor(
    private readonly inventoryQueryService: InventoryQueryService,
    private readonly inventoryCommandService: InventoryCommandService,
    private readonly inventoryAnalysisService: InventoryAnalysisService,
  ) {}

  async createIngredient(
    createIngredientDto: CreateIngredientDto,
    actor?: User,
    request?: Request,
  ): Promise<Ingredient> {
    return this.inventoryCommandService.createIngredient(
      createIngredientDto,
      actor,
      request,
    );
  }

  async findAllIngredients(
    req: InventoryRequest,
    filters: GetIngredientsDto,
  ): Promise<Pagination<Ingredient>> {
    return this.inventoryQueryService.findAllIngredients(req, filters);
  }

  async findOneIngredient(
    id: string,
    requesterRestaurantId?: string,
  ): Promise<Ingredient> {
    return this.inventoryQueryService.findOneIngredient(
      id,
      requesterRestaurantId,
    );
  }

  async getStocks(
    restaurantId: string,
    page: number = 1,
    limit: number = 10,
    actor?: User,
  ): Promise<PaginatedArrayResult<Stock>> {
    return this.inventoryQueryService.getStocks(
      restaurantId,
      page,
      limit,
      actor,
    );
  }

  async getBranchStocks(
    branchId: string,
    page: number = 1,
    limit: number = 10,
    actor?: User,
  ): Promise<PaginatedArrayResult<BranchStock>> {
    return this.inventoryQueryService.getBranchStocks(
      branchId,
      page,
      limit,
      actor,
    );
  }

  async initBranchStocks(
    branchId: string,
    brandId: string,
  ): Promise<{ initializedCount: number }> {
    return this.inventoryCommandService.initBranchStocks(branchId, brandId);
  }

  async initBranchStocksForRequester(
    branchId: string,
    requesterRestaurantId: string,
  ): Promise<{ initializedCount: number }> {
    return this.inventoryCommandService.initBranchStocksForRequester(
      branchId,
      requesterRestaurantId,
    );
  }

  async getSummary(
    restaurantId: string,
  ): Promise<{ criticalStockCount: number }> {
    return this.inventoryQueryService.getSummary(restaurantId);
  }

  async addStockMovement(
    dto: CreateStockMovementDto,
    actor?: User,
    request?: Request,
  ): Promise<StockMovement> {
    return this.inventoryCommandService.addStockMovement(dto, actor, request);
  }

  async createRecipe(
    dto: CreateRecipeDto,
    actor?: User,
    request?: Request,
  ): Promise<Recipe> {
    return this.inventoryCommandService.createRecipe(dto, actor, request);
  }

  async getProductRecipe(productId: string): Promise<Recipe[]> {
    return this.inventoryQueryService.getProductRecipe(productId);
  }

  async updateIngredient(
    id: string,
    dto: UpdateIngredientDto,
    actor?: User,
    request?: Request,
  ): Promise<Ingredient> {
    return this.inventoryCommandService.updateIngredient(
      id,
      dto,
      actor,
      request,
    );
  }

  async deleteIngredient(
    id: string,
    actor?: User,
    request?: Request,
  ): Promise<void> {
    return this.inventoryCommandService.deleteIngredient(id, actor, request);
  }

  async deleteRecipe(
    id: string,
    actor?: User,
    request?: Request,
  ): Promise<void> {
    return this.inventoryCommandService.deleteRecipe(id, actor, request);
  }

  async findAllMovements(
    req: InventoryRequest,
    filters: GetStockMovementsDto,
  ): Promise<Pagination<StockMovement>> {
    return this.inventoryQueryService.findAllMovements(req, filters);
  }

  async findAllMovementsForExport(
    req: InventoryRequest,
    queryDto: GetStockMovementsDto,
  ): Promise<StockMovement[]> {
    return this.inventoryQueryService.findAllMovementsForExport(req, queryDto);
  }

  async decreaseStockForOrder(
    order: Order,
    queryRunner: QueryRunner,
  ): Promise<void> {
    return this.inventoryCommandService.decreaseStockForOrder(
      order,
      queryRunner,
    );
  }

  async getIngredientUsage(ingredientId: string, restaurantId: string) {
    return this.inventoryQueryService.getIngredientUsage(
      ingredientId,
      restaurantId,
    );
  }

  async calculateCostImpact(
    restaurantId: string,
    days: number = 7,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.inventoryAnalysisService.calculateCostImpact(
      restaurantId,
      days,
      page,
      limit,
    );
  }

  async getCountDifferences(
    restaurantId: string,
    weeks: number = 4,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.inventoryAnalysisService.getCountDifferences(
      restaurantId,
      weeks,
      page,
      limit,
    );
  }

  async getFoodCostAlerts(
    restaurantId: string,
    page: number = 1,
    limit: number = 10,
    refresh: boolean = false,
  ) {
    return this.inventoryAnalysisService.getFoodCostAlerts(
      restaurantId,
      page,
      limit,
      refresh,
    );
  }
}
