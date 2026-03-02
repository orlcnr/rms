import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Order } from '../orders/entities/order.entity';
import { Table } from '../tables/entities/table.entity';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { Payment } from '../payments/entities/payment.entity';
import { DashboardEventsListener } from './listeners/dashboard-events.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Table, Ingredient, Payment])],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardEventsListener],
})
export class DashboardModule {}
