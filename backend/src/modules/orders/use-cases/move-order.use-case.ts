import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, QueryRunner } from 'typeorm';

import { Order, OrderStatus, OrderType } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Table, TableStatus } from '../../tables/entities/table.entity';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { TransactionalHelper } from '../../../common/databases/transactional.helper';
import { calculateOrderTotalFromItems } from '../utils/order-total.util';

const ACTIVE_ORDER_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
] as const;

@Injectable()
export class MoveOrderUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly transactionalHelper: TransactionalHelper,
  ) {}

  async execute(
    orderId: string,
    newTableId: string,
    restaurantId: string,
    onTargetOccupied: 'reject' | 'merge' = 'reject',
  ): Promise<Order> {
    const result = await this.transactionalHelper.runInTransaction(
      async (queryRunner) => {
        const sourceOrder = await this.getOrder(
          queryRunner,
          orderId,
          restaurantId,
        );
        this.validateOrder(sourceOrder);
        this.validateOrderType(sourceOrder);

        const newTable = await this.getNewTable(
          queryRunner,
          newTableId,
          restaurantId,
        );
        this.validateTableChange(sourceOrder, newTable);

        const targetOrder = await this.findActiveOrderByTable(
          queryRunner,
          newTableId,
          restaurantId,
          sourceOrder.id,
        );

        const oldTable = sourceOrder.table;

        if (targetOrder) {
          this.validateOrder(targetOrder);
          this.validateOrderType(targetOrder);

          if (onTargetOccupied !== 'merge') {
            throw new ConflictException('ORDER_MOVE_TARGET_OCCUPIED');
          }

          await this.mergeIntoTarget(queryRunner, sourceOrder, targetOrder);
          await this.updateOldTable(queryRunner, oldTable, restaurantId);
          await this.updateNewTable(queryRunner, newTable);

          return {
            finalOrderId: targetOrder.id,
            oldTable,
            newTable,
          };
        }

        await this.moveOrder(queryRunner, sourceOrder, newTable.id);
        await this.updateOldTable(queryRunner, oldTable, restaurantId);
        await this.updateNewTable(queryRunner, newTable);

        return {
          finalOrderId: sourceOrder.id,
          oldTable,
          newTable,
        };
      },
    );

    const finalOrder = await this.loadFinalOrder(result.finalOrderId);

    this.sendNotifications(
      restaurantId,
      result.oldTable,
      result.newTable,
      finalOrder,
    );

    return finalOrder;
  }

  private async getOrder(
    qr: QueryRunner,
    orderId: string,
    restaurantId: string,
  ): Promise<Order> {
    const order = await qr.manager.findOne(Order, {
      where: { id: orderId, restaurantId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.tableId) {
      const table = await qr.manager.findOne(Table, {
        where: { id: order.tableId },
      });
      if (table) order.table = table;
    }

    return order;
  }

  private async getNewTable(
    qr: QueryRunner,
    tableId: string,
    restaurantId: string,
  ): Promise<Table> {
    const existingTable = await qr.manager.findOne(Table, {
      where: { id: tableId },
      select: ['id', 'restaurant_id', 'status'],
    });

    if (!existingTable) {
      throw new NotFoundException('Table not found.');
    }

    if (existingTable.restaurant_id !== restaurantId) {
      throw new BadRequestException('ORDER_MOVE_CROSS_BRANCH_NOT_ALLOWED');
    }

    const table = await qr.manager.findOne(Table, {
      where: { id: tableId, restaurant_id: restaurantId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!table) {
      throw new NotFoundException('Table not found.');
    }

    if (table.status === TableStatus.OUT_OF_SERVICE) {
      throw new BadRequestException('Target table is out of service.');
    }

    return table;
  }

  private async findActiveOrderByTable(
    qr: QueryRunner,
    tableId: string,
    restaurantId: string,
    sourceOrderId: string,
  ): Promise<Order | null> {
    return qr.manager.findOne(Order, {
      where: {
        tableId,
        restaurantId,
        id: Not(sourceOrderId),
        status: In([...ACTIVE_ORDER_STATUSES]),
      },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private validateOrder(order: Order): void {
    if ([OrderStatus.PAID, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException(`Order cannot be moved (${order.status}).`);
    }
  }

  private validateOrderType(order: Order): void {
    if (order.type !== OrderType.DINE_IN) {
      throw new BadRequestException('ORDER_MOVE_NOT_ALLOWED_FOR_TYPE');
    }
  }

  private validateTableChange(order: Order, table: Table): void {
    if (order.tableId === table.id) {
      throw new BadRequestException('Order already on this table.');
    }
  }

  private async moveOrder(
    qr: QueryRunner,
    order: Order,
    tableId: string,
  ): Promise<void> {
    await qr.manager.update(Order, order.id, {
      tableId,
      mergedInto: null,
    });

    order.tableId = tableId;
    order.mergedInto = null;
  }

  private async mergeIntoTarget(
    qr: QueryRunner,
    sourceOrder: Order,
    targetOrder: Order,
  ): Promise<void> {
    await qr.manager.update(
      OrderItem,
      { orderId: sourceOrder.id },
      { orderId: targetOrder.id },
    );

    const targetItems = await qr.manager.find(OrderItem, {
      where: { orderId: targetOrder.id },
    });

    targetOrder.totalAmount = calculateOrderTotalFromItems(targetItems);
    await qr.manager.save(Order, targetOrder);

    sourceOrder.status = OrderStatus.CANCELLED;
    sourceOrder.tableId = null;
    sourceOrder.mergedInto = targetOrder.id;
    await qr.manager.save(Order, sourceOrder);
  }

  private async updateOldTable(
    qr: QueryRunner,
    table: Table | null,
    restaurantId: string,
  ): Promise<void> {
    if (!table) return;

    const remaining = await qr.manager.count(Order, {
      where: {
        tableId: table.id,
        restaurantId,
        status: In([...ACTIVE_ORDER_STATUSES]),
      },
    });

    if (remaining === 0 && table.status !== TableStatus.AVAILABLE) {
      table.status = TableStatus.AVAILABLE;
      await qr.manager.save(table);
    }
  }

  private async updateNewTable(qr: QueryRunner, table: Table): Promise<void> {
    if (table.status !== TableStatus.OCCUPIED) {
      table.status = TableStatus.OCCUPIED;
      await qr.manager.save(table);
    }
  }

  private sendNotifications(
    restaurantId: string,
    oldTable: Table | null,
    newTable: Table,
    order: Order,
  ): void {
    if (oldTable) {
      this.notificationsGateway.notifyOrderStatus(restaurantId, oldTable);
    }

    this.notificationsGateway.notifyOrderStatus(restaurantId, newTable);
    this.notificationsGateway.notifyOrderStatus(restaurantId, order);
  }

  private async loadFinalOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.menuItem', 'table', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found after move.');
    }

    return order;
  }
}
