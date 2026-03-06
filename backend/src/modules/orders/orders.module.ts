import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Table } from '../tables/entities/table.entity';
import { User } from '../users/entities/user.entity';
import { TablesModule } from '../tables/tables.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MoveOrderUseCase } from './use-cases/move-order.use-case';
import { TransactionalHelper } from '../../common/databases/transactional.helper';
import { MenusModule } from '../menus/menus.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Table, User]),
    TablesModule,
    NotificationsModule,
    MenusModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, MoveOrderUseCase, TransactionalHelper],
  exports: [OrdersService],
})
export class OrdersModule {}
