import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { SalesReportService } from './services/sales-report.service';
import { InventoryReportService } from './services/inventory-report.service';
import { FinanceReportService } from './services/finance-report.service';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Stock } from '../inventory/entities/stock.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Stock,
      StockMovement,
      Ingredient,
      Payment,
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    SalesReportService,
    InventoryReportService,
    FinanceReportService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
