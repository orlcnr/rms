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
import { OrdersRepository } from './repositories/orders.repository';
import { OrderItemRepository } from './repositories/order-item.repository';
import { OrdersQueryService } from './services/orders-query.service';
import { OrdersCommandService } from './services/orders-command.service';
import { OrdersAuthorizationService } from './services/orders-authorization.service';
import { OrderQueryFactory } from './query/factories/order-query.factory';
import { UpdateOrderItemsUseCase } from './use-cases/update-order-items.use-case';
import { BatchUpdateStatusUseCase } from './use-cases/batch-update-status.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Table, User]),
    TablesModule,
    NotificationsModule,
    MenusModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersQueryService,
    OrdersCommandService,
    OrdersAuthorizationService,
    OrdersRepository,
    OrderItemRepository,
    OrderQueryFactory,
    MoveOrderUseCase,
    UpdateOrderItemsUseCase,
    BatchUpdateStatusUseCase,
    TransactionalHelper,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
