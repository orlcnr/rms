import {
  Controller,
  Request,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ValidationPipe,
  Query,
  Res,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { BulkUpdateStockUseCase } from './use-cases/bulk-update-stock.use-case';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { GetStockMovementsDto } from './dto/get-stock-movements.dto';
import { GetIngredientsDto } from './dto/get-ingredients.dto';
import {
  GetCostAnalysisDto,
  GetCountDifferencesDto,
  GetFoodCostAlertsDto,
} from './dto/get-cost-analysis.dto';
import { InventorySummaryDto } from './dto/inventory-summary.dto';
import { BulkStockUpdateDto } from './dto/bulk-stock-update.dto';
import { BulkUpdateStockResponseDto } from './dto/bulk-update-stock-response.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import type { Request as ExpressRequest, Response } from 'express';
import * as ExcelJS from 'exceljs';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

type InventoryRequest = ExpressRequest & {
  user: {
    restaurantId: string;
  };
};

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly bulkUpdateStockUseCase: BulkUpdateStockUseCase,
  ) {}

  private toPaginationMeta(meta: {
    currentPage: number;
    itemsPerPage: number;
    itemCount: number;
    totalItems?: number;
    totalPages?: number;
  }): PaginationMetaDto {
    const totalItems = Number(meta.totalItems ?? meta.itemCount ?? 0);
    const totalPages =
      Number(meta.totalPages ?? 0) ||
      (meta.itemsPerPage > 0 ? Math.ceil(totalItems / meta.itemsPerPage) : 0);

    return new PaginationMetaDto({
      page: meta.currentPage,
      limit: meta.itemsPerPage,
      itemCount: meta.itemCount,
      totalItems,
      totalPages,
      hasPreviousPage: meta.currentPage > 1,
      hasNextPage: meta.currentPage < totalPages,
    });
  }

  @Get('movements')
  async findAllMovements(
    @Request() req: InventoryRequest,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: GetStockMovementsDto,
  ) {
    const result = await this.inventoryService.findAllMovements(req, filters);
    return ApiResponseDto.ok({
      items: result.items,
      meta: this.toPaginationMeta(result.meta),
    });
  }

  @Get('movements/export')
  @ApiOperation({
    summary: 'Filtrelenmiş stok hareketlerini Excel olarak dışa aktar',
  })
  async exportMovements(
    @Request() req: InventoryRequest,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    queryDto: GetStockMovementsDto,
    @Res() res: Response,
  ) {
    const movements = await this.inventoryService.findAllMovementsForExport(
      req,
      queryDto,
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Stok Hareketleri');

    worksheet.columns = [
      { header: 'Tarih', key: 'created_at', width: 25 },
      { header: 'Malzeme', key: 'ingredientName', width: 30 },
      { header: 'Tip', key: 'type', width: 15 },
      { header: 'Miktar', key: 'quantity', width: 15 },
      { header: 'Birim', key: 'unit', width: 15 },
      { header: 'Neden', key: 'reason', width: 40 },
    ];

    worksheet.getRow(1).font = { bold: true };

    movements.forEach((m) => {
      worksheet.addRow({
        created_at: new Date(m.created_at).toLocaleString('tr-TR'),
        ingredientName: m.ingredient.name,
        type: m.type,
        quantity: m.quantity,
        unit: m.ingredient.unit,
        reason: m.reason,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stok_hareketleri_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  }

  @Post('ingredients')
  @ApiOperation({ summary: 'Yeni malzeme oluştur' })
  async createIngredient(
    @Body(ValidationPipe) dto: CreateIngredientDto,
    @GetUser() user: User,
    @Request() req: InventoryRequest,
  ) {
    const data = await this.inventoryService.createIngredient(dto, user, req);
    return ApiResponseDto.ok(data);
  }

  @Get('ingredients')
  @ApiOperation({ summary: 'Restorana ait malzemeleri sayfalı olarak getir' })
  async findAllIngredients(
    @Request() req: InventoryRequest,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: GetIngredientsDto,
  ) {
    const result = await this.inventoryService.findAllIngredients(req, filters);
    return ApiResponseDto.ok({
      items: result.items,
      meta: this.toPaginationMeta(result.meta),
    });
  }

  @Get('ingredients/cost-impact')
  @ApiOperation({ summary: 'Fiyatı en çok artan malzemelerin maliyet etkisi' })
  async calculateCostImpact(
    @Request() req: InventoryRequest,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetCostAnalysisDto,
  ) {
    const restaurantId = req.user.restaurantId;
    const result = await this.inventoryService.calculateCostImpact(
      restaurantId,
      query.days,
      query.page,
      query.limit,
    );
    return ApiResponseDto.ok({
      items: result.items,
      meta: this.toPaginationMeta(result.meta),
    });
  }

  @Get('ingredients/:id/usage')
  @ApiOperation({ summary: 'Malzemenin kullanıldığı ürünleri getir' })
  async getIngredientUsage(
    @Param('id') id: string,
    @Request() req: InventoryRequest,
  ) {
    const restaurantId = req.user.restaurantId;
    const data = await this.inventoryService.getIngredientUsage(
      id,
      restaurantId,
    );
    return ApiResponseDto.ok(data);
  }

  @Get('ingredients/:id')
  @ApiOperation({ summary: 'Tek bir malzemeyi ID ile getir' })
  async findOneIngredient(@Param('id') id: string, @GetUser() user: User) {
    const data = await this.inventoryService.findOneIngredient(
      id,
      user.restaurant_id,
    );
    return ApiResponseDto.ok(data);
  }

  @Patch('ingredients/:id')
  @ApiOperation({ summary: 'Malzeme güncelle' })
  async updateIngredient(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateIngredientDto,
    @GetUser() user: User,
    @Request() req: InventoryRequest,
  ) {
    const data = await this.inventoryService.updateIngredient(
      id,
      dto,
      user,
      req,
    );
    return ApiResponseDto.ok(data);
  }

  @Delete('ingredients/:id')
  @ApiOperation({ summary: 'Malzeme sil' })
  async deleteIngredient(
    @Param('id') id: string,
    @GetUser() user: User,
    @Request() req: InventoryRequest,
  ) {
    await this.inventoryService.deleteIngredient(id, user, req);
    return ApiResponseDto.empty('Malzeme silindi');
  }

  @Get('stocks/restaurant/:restaurantId')
  @ApiOperation({ summary: 'Restorana ait stok durumlarını getir' })
  async getStocks(
    @Param('restaurantId') restaurantId: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    pagination: PaginationDto,
    @GetUser() user: User,
  ) {
    const result = await this.inventoryService.getStocks(
      restaurantId,
      pagination.page,
      pagination.limit,
      user,
    );
    return ApiResponseDto.ok({
      items: result.items,
      meta: this.toPaginationMeta(result.meta),
    });
  }

  @Get('branches/:branchId/stocks')
  @ApiOperation({ summary: 'Şubeye ait stok durumlarını getir' })
  async getBranchStocks(
    @Param('branchId') branchId: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    pagination: PaginationDto,
    @GetUser() user: User,
  ) {
    const result = await this.inventoryService.getBranchStocks(
      branchId,
      pagination.page,
      pagination.limit,
      user,
    );
    return ApiResponseDto.ok({
      items: result.items,
      meta: this.toPaginationMeta(result.meta),
    });
  }

  @Post('branches/:branchId/init-stocks')
  @ApiOperation({
    summary: 'Şube için brand malzemelerini 0 stokla initialize et',
  })
  async initBranchStocks(
    @Param('branchId') branchId: string,
    @GetUser() user: User,
  ) {
    const data = await this.inventoryService.initBranchStocksForRequester(
      branchId,
      user.restaurant_id,
    );
    return ApiResponseDto.ok(data);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Envanter özet metrikleri' })
  @ApiResponse({ status: 200, type: InventorySummaryDto })
  async getSummary(@GetUser() user: User) {
    const data = await this.inventoryService.getSummary(user.restaurant_id);
    return ApiResponseDto.ok(data);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Stok hareketi ekle (Giriş/Çıkış/Düzeltme)' })
  async addMovement(
    @Body(ValidationPipe) dto: CreateStockMovementDto,
    @GetUser() user: User,
    @Request() req: InventoryRequest,
  ) {
    const data = await this.inventoryService.addStockMovement(dto, user, req);
    return ApiResponseDto.ok(data);
  }

  @Post('recipes')
  @ApiOperation({ summary: 'Ürüne reçete kalemi ekle' })
  async createRecipe(
    @Body(ValidationPipe) dto: CreateRecipeDto,
    @GetUser() user: User,
    @Request() req: InventoryRequest,
  ) {
    const data = await this.inventoryService.createRecipe(dto, user, req);
    return ApiResponseDto.ok(data);
  }

  @Get('recipes/product/:productId')
  @ApiOperation({ summary: 'Ürünün reçetesini getir' })
  async getProductRecipe(@Param('productId') productId: string) {
    const data = await this.inventoryService.getProductRecipe(productId);
    return ApiResponseDto.ok(data);
  }

  @Delete('recipes/:id')
  @ApiOperation({ summary: 'Reçete kalemini sil' })
  async deleteRecipe(
    @Param('id') id: string,
    @GetUser() user: User,
    @Request() req: InventoryRequest,
  ) {
    await this.inventoryService.deleteRecipe(id, user, req);
    return ApiResponseDto.empty('Reçete kalemi silindi');
  }

  @Post('stocks/bulk-update')
  @ApiOperation({ summary: 'Toplu stok güncelleme (Hızlı Sayım Modu)' })
  @ApiResponse({ status: 200, type: BulkUpdateStockResponseDto })
  async bulkUpdateStock(
    @Body(ValidationPipe) dto: BulkStockUpdateDto,
    @GetUser() user: User,
    @Request() req: InventoryRequest,
  ) {
    const data = await this.bulkUpdateStockUseCase.execute(
      dto.updates,
      user,
      req,
    );
    return ApiResponseDto.ok(data);
  }

  @Get('analysis/count-differences')
  @ApiOperation({ summary: 'Sayım farkları raporu' })
  async getCountDifferences(
    @Request() req: InventoryRequest,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetCountDifferencesDto,
  ) {
    const restaurantId = req.user.restaurantId;
    const result = await this.inventoryService.getCountDifferences(
      restaurantId,
      query.weeks,
      query.page,
      query.limit,
    );
    return ApiResponseDto.ok({
      items: result.items,
      meta: this.toPaginationMeta(result.meta),
    });
  }

  @Get('analysis/food-cost-alerts')
  @ApiOperation({ summary: 'Food Cost eşik değerini aşan ürünler' })
  async getFoodCostAlerts(
    @Request() req: InventoryRequest,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetFoodCostAlertsDto,
  ) {
    const restaurantId = req.user.restaurantId;
    const result = await this.inventoryService.getFoodCostAlerts(
      restaurantId,
      query.page,
      query.limit,
      query.refresh,
    );
    return ApiResponseDto.ok({
      items: result.items,
      meta: this.toPaginationMeta(result.meta),
    });
  }
}
