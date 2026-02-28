import {
  Controller,
  Request,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  ValidationPipe,
  Query,
  Res,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateStockMovementUseCase } from './use-cases/create-stock-movement.use-case';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { GetStockMovementsDto } from './dto/get-stock-movements.dto';
import { GetIngredientsDto } from './dto/get-ingredients.dto'; // Import GetIngredientsDto
import {
  GetCostAnalysisDto,
  GetCountDifferencesDto,
} from './dto/get-cost-analysis.dto';
import { BulkStockUpdateDto } from './dto/bulk-stock-update.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import type { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly createStockMovementUseCase: CreateStockMovementUseCase,
  ) {}

  @Get('movements')
  findAllMovements(
    @Request() req,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: GetStockMovementsDto,
  ) {
    return this.inventoryService.findAllMovements(req, filters);
  }

  @Get('movements/export')
  @ApiOperation({
    summary: 'Filtrelenmiş stok hareketlerini Excel olarak dışa aktar',
  })
  async exportMovements(
    @Request() req,
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
  createIngredient(@Body(ValidationPipe) dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(dto);
  }

  @Get('ingredients')
  @ApiOperation({ summary: 'Restorana ait malzemeleri sayfalı olarak getir' })
  findAllIngredients(
    @Request() req,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: GetIngredientsDto,
  ) {
    return this.inventoryService.findAllIngredients(req, filters);
  }

  // ============================================
  // MALİYET ANALİZ ENDPOINT'LERİ (Parametreli route'lardan ÖNCE!)
  // ============================================

  @Get('ingredients/cost-impact')
  @ApiOperation({ summary: 'Fiyatı en çok artan malzemelerin maliyet etkisi' })
  calculateCostImpact(
    @Request() req,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetCostAnalysisDto,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.inventoryService.calculateCostImpact(restaurantId, query.days);
  }

  @Get('ingredients/:id/usage')
  @ApiOperation({ summary: 'Malzemenin kullanıldığı ürünleri getir' })
  getIngredientUsage(@Param('id') id: string, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.inventoryService.getIngredientUsage(id, restaurantId);
  }

  @Get('ingredients/:id')
  @ApiOperation({ summary: 'Tek bir malzemeyi ID ile getir' })
  findOneIngredient(@Param('id') id: string) {
    return this.inventoryService.findOneIngredient(id);
  }

  @Patch('ingredients/:id')
  @ApiOperation({ summary: 'Malzeme güncelle' })
  updateIngredient(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: Partial<CreateIngredientDto>,
  ) {
    return this.inventoryService.updateIngredient(id, dto);
  }

  @Delete('ingredients/:id')
  @ApiOperation({ summary: 'Malzeme sil' })
  deleteIngredient(@Param('id') id: string) {
    return this.inventoryService.deleteIngredient(id);
  }

  @Get('stocks/restaurant/:restaurantId')
  @ApiOperation({ summary: 'Restorana ait stok durumlarını getir' })
  getStocks(@Param('restaurantId') restaurantId: string) {
    return this.inventoryService.getStocks(restaurantId);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Stok hareketi ekle (Giriş/Çıkış/Düzeltme)' })
  addMovement(@Body(ValidationPipe) dto: CreateStockMovementDto) {
    return this.createStockMovementUseCase.execute(dto);
  }

  @Post('recipes')
  @ApiOperation({ summary: 'Ürüne reçete kalemi ekle' })
  createRecipe(@Body(ValidationPipe) dto: CreateRecipeDto) {
    return this.inventoryService.createRecipe(dto);
  }

  @Get('recipes/product/:productId')
  @ApiOperation({ summary: 'Ürünün reçetesini getir' })
  getProductRecipe(@Param('productId') productId: string) {
    return this.inventoryService.getProductRecipe(productId);
  }

  @Delete('recipes/:id')
  @ApiOperation({ summary: 'Reçete kalemini sil' })
  deleteRecipe(@Param('id') id: string) {
    return this.inventoryService.deleteRecipe(id);
  }

  @Post('stocks/bulk-update')
  @ApiOperation({ summary: 'Toplu stok güncelleme (Hızlı Sayım Modu)' })
  bulkUpdateStock(@Body(ValidationPipe) dto: BulkStockUpdateDto) {
    return this.inventoryService.bulkUpdateStock(dto.updates);
  }

  // ============================================
  // MALİYET ANALİZ ENDPOINT'LERİ
  // ============================================

  @Get('analysis/count-differences')
  @ApiOperation({ summary: 'Sayım farkları raporu' })
  getCountDifferences(
    @Request() req,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetCountDifferencesDto,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.inventoryService.getCountDifferences(restaurantId, query.weeks);
  }

  @Get('analysis/food-cost-alerts')
  @ApiOperation({ summary: 'Food Cost %35 aşan ürünler' })
  getFoodCostAlerts(@Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.inventoryService.getFoodCostAlerts(restaurantId);
  }
}
