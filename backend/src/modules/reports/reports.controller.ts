import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { DateRangeDto } from './dto/date-range.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GetAuditLogsDto } from '../audit/dto/get-audit-logs.dto';
import { ExportAuditLogsDto } from '../audit/dto/export-audit-logs.dto';

import { CacheTTL } from '@nestjs/cache-manager';

import { RestaurantCacheInterceptor } from '../../common/interceptors/restaurant-cache.interceptor';

interface ReportsUserContext {
  restaurantId?: string;
  restaurant_id?: string;
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER, Role.MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales/daily')
  @UseInterceptors(RestaurantCacheInterceptor)
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get daily sales report' })
  async getDailySales(
    @GetUser() user: ReportsUserContext,
    @Query() query: DateRangeDto,
  ) {
    return this.reportsService.getDailySales(this.getRestaurantId(user), query);
  }

  @Get('sales/by-product')
  @UseInterceptors(RestaurantCacheInterceptor)
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get sales report by product' })
  async getSalesByProduct(
    @GetUser() user: ReportsUserContext,
    @Query() query: DateRangeDto,
  ) {
    return this.reportsService.getSalesByProduct(
      this.getRestaurantId(user),
      query,
    );
  }

  @Get('sales/by-category')
  @UseInterceptors(RestaurantCacheInterceptor)
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get sales report by category' })
  async getSalesByCategory(
    @GetUser() user: ReportsUserContext,
    @Query() query: DateRangeDto,
  ) {
    return this.reportsService.getSalesByCategory(
      this.getRestaurantId(user),
      query,
    );
  }

  @Get('sales/hourly')
  @UseInterceptors(RestaurantCacheInterceptor)
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get hourly sales distribution report' })
  async getHourlySales(
    @GetUser() user: ReportsUserContext,
    @Query('date') date?: string,
  ) {
    return this.reportsService.getHourlySales(this.getRestaurantId(user), {
      date,
    });
  }

  // Inventory Reports
  @Get('inventory/status')
  @UseInterceptors(RestaurantCacheInterceptor)
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get current stock status' })
  async getStockStatus(@GetUser() user: ReportsUserContext) {
    return this.reportsService.getStockStatus(this.getRestaurantId(user));
  }

  @Get('inventory/movements')
  @UseInterceptors(RestaurantCacheInterceptor)
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get stock movement report' })
  async getStockMovements(
    @GetUser() user: ReportsUserContext,
    @Query() query: DateRangeDto,
  ) {
    return this.reportsService.getStockMovements(
      this.getRestaurantId(user),
      query,
    );
  }

  @Get('inventory/wastage')
  @UseInterceptors(RestaurantCacheInterceptor)
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get wastage/fire report' })
  async getWastageReport(
    @GetUser() user: ReportsUserContext,
    @Query() query: DateRangeDto,
  ) {
    return this.reportsService.getWastageReport(
      this.getRestaurantId(user),
      query,
    );
  }

  // Finance Reports
  @Get('finance/payments')
  @UseInterceptors(RestaurantCacheInterceptor)
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get payment method statistics' })
  async getPaymentMethodStats(
    @GetUser() user: ReportsUserContext,
    @Query() query: DateRangeDto,
  ) {
    return this.reportsService.getPaymentMethodStats(
      this.getRestaurantId(user),
      query,
    );
  }

  @Get('finance/discounts')
  @UseInterceptors(RestaurantCacheInterceptor)
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get discount statistics' })
  async getDiscountStats(
    @GetUser() user: ReportsUserContext,
    @Query() query: DateRangeDto,
  ) {
    return this.reportsService.getDiscountStats(
      this.getRestaurantId(user),
      query,
    );
  }

  @Get('audit-logs')
  @UseInterceptors(RestaurantCacheInterceptor)
  @CacheTTL(300)
  @ApiOperation({ summary: 'Get audit logs report' })
  async getAuditLogs(
    @GetUser() user: ReportsUserContext,
    @Query() query: GetAuditLogsDto,
  ) {
    return this.reportsService.getAuditLogs(this.getRestaurantId(user), query);
  }

  @Get('audit-logs/export')
  @ApiOperation({ summary: 'Export audit logs report as CSV' })
  async exportAuditLogsCsv(
    @GetUser() user: ReportsUserContext,
    @Query() query: ExportAuditLogsDto,
    @Res() res: Response,
  ) {
    const { filename, content } = await this.reportsService.exportAuditLogsCsv(
      this.getRestaurantId(user),
      query,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }

  private getRestaurantId(user: ReportsUserContext): string {
    const restaurantId = user.restaurantId || user.restaurant_id;

    if (!restaurantId) {
      throw new Error('Restaurant context is missing');
    }

    return restaurantId;
  }
}
