import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { DateRangeDto } from './dto/date-range.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

import { RestaurantCacheInterceptor } from '../../common/interceptors/restaurant-cache.interceptor';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseInterceptors(RestaurantCacheInterceptor)
@Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER, Role.MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales/daily')
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get daily sales report' })
  async getDailySales(@GetUser() user: any, @Query() query: DateRangeDto) {
    return this.reportsService.getDailySales(user.restaurantId, query);
  }

  @Get('sales/by-product')
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get sales report by product' })
  async getSalesByProduct(@GetUser() user: any, @Query() query: DateRangeDto) {
    return this.reportsService.getSalesByProduct(user.restaurantId, query);
  }

  @Get('sales/by-category')
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get sales report by category' })
  async getSalesByCategory(@GetUser() user: any, @Query() query: DateRangeDto) {
    return this.reportsService.getSalesByCategory(user.restaurantId, query);
  }

  @Get('sales/hourly')
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get hourly sales distribution report' })
  async getHourlySales(@GetUser() user: any, @Query('date') date?: string) {
    return this.reportsService.getHourlySales(user.restaurantId, { date });
  }

  // Inventory Reports
  @Get('inventory/status')
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get current stock status' })
  async getStockStatus(@GetUser() user: any) {
    return this.reportsService.getStockStatus(user.restaurantId);
  }

  @Get('inventory/movements')
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get stock movement report' })
  async getStockMovements(@GetUser() user: any, @Query() query: DateRangeDto) {
    return this.reportsService.getStockMovements(user.restaurantId, query);
  }

  @Get('inventory/wastage')
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get wastage/fire report' })
  async getWastageReport(@GetUser() user: any, @Query() query: DateRangeDto) {
    return this.reportsService.getWastageReport(user.restaurantId, query);
  }

  // Finance Reports
  @Get('finance/payments')
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get payment method statistics' })
  async getPaymentMethodStats(
    @GetUser() user: any,
    @Query() query: DateRangeDto,
  ) {
    return this.reportsService.getPaymentMethodStats(user.restaurantId, query);
  }

  @Get('finance/discounts')
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Get discount statistics' })
  async getDiscountStats(@GetUser() user: any, @Query() query: DateRangeDto) {
    return this.reportsService.getDiscountStats(user.restaurantId, query);
  }
}
