import { Injectable } from '@nestjs/common';
import { SalesReportService } from './services/sales-report.service';
import { InventoryReportService } from './services/inventory-report.service';
import { FinanceReportService } from './services/finance-report.service';
import { DateRangeDto } from './dto/date-range.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly salesReportService: SalesReportService,
    private readonly inventoryReportService: InventoryReportService,
    private readonly financeReportService: FinanceReportService,
  ) {}

  async getDailySales(restaurantId: string, query: DateRangeDto) {
    return this.salesReportService.getDailySales(restaurantId, query);
  }

  async getSalesByProduct(restaurantId: string, query: DateRangeDto) {
    return this.salesReportService.getSalesByProduct(restaurantId, query);
  }

  async getSalesByCategory(restaurantId: string, query: DateRangeDto) {
    return this.salesReportService.getSalesByCategory(restaurantId, query);
  }

  async getHourlySales(restaurantId: string, query: { date?: string }) {
    return this.salesReportService.getHourlySales(restaurantId, query);
  }

  // Inventory Reports
  async getStockStatus(restaurantId: string) {
    return this.inventoryReportService.getStockStatus(restaurantId);
  }

  async getStockMovements(restaurantId: string, query: DateRangeDto) {
    return this.inventoryReportService.getStockMovements(restaurantId, query);
  }

  async getWastageReport(restaurantId: string, query: DateRangeDto) {
    return this.inventoryReportService.getWastageReport(restaurantId, query);
  }

  // Finance Reports
  async getPaymentMethodStats(restaurantId: string, query: DateRangeDto) {
    return this.financeReportService.getPaymentMethodStats(restaurantId, query);
  }

  async getDiscountStats(restaurantId: string, query: DateRangeDto) {
    return this.financeReportService.getDiscountStats(restaurantId, query);
  }
}
