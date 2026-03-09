import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, QueryRunner } from 'typeorm';

import { Order, OrderStatus, OrderType } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Table, TableStatus } from '../../tables/entities/table.entity';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { TransactionalHelper } from '../../../common/databases/transactional.helper';
import { calculateOrderTotalFromItems } from '../utils/order-total.util';
import { OrderUseCaseResult } from '../interfaces/order-use-case-result.interface';
import { OrderErrorCodes } from '../errors/order-error-codes';

const ACTIVE_ORDER_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
] as const;

@Injectable()
export class MoveOrderUseCase {
  private readonly logger = new Logger(MoveOrderUseCase.name);

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
  ): Promise<OrderUseCaseResult<Order>> {
    try {
      const result: OrderUseCaseResult<{
        finalOrderId: string;
        oldTable: Table | null;
        newTable: Table;
      }> = await this.transactionalHelper.runInTransaction(
        async (queryRunner) => {
          this.logger.debug(
            JSON.stringify({
              step: 'move_order.start',
              orderId,
              newTableId,
              restaurantId,
              onTargetOccupied,
            }),
          );

          const sourceOrder = await this.getOrder(
            queryRunner,
            orderId,
            restaurantId,
          );
          if (!sourceOrder) {
            return {
              ok: false as const,
              code: OrderErrorCodes.ORDER_NOT_FOUND,
              message: 'Order not found.',
            };
          }

          const sourceOrderValidation = this.validateOrder(sourceOrder);
          if (sourceOrderValidation) {
            return sourceOrderValidation;
          }

          const typeValidation = this.validateOrderType(sourceOrder);
          if (typeValidation) {
            return typeValidation;
          }

          const newTable = await this.getNewTable(
            queryRunner,
            newTableId,
            restaurantId,
          );
          if (!newTable) {
            return {
              ok: false as const,
              code: OrderErrorCodes.ORDER_TABLE_NOT_FOUND,
              message: 'Table not found.',
            };
          }

          const tableChangeValidation = this.validateTableChange(
            sourceOrder,
            newTable,
          );
          if (tableChangeValidation) {
            return tableChangeValidation;
          }

          const targetOrder = await this.findActiveOrderByTable(
            queryRunner,
            newTableId,
            restaurantId,
            sourceOrder.id,
          );

          const oldTable = sourceOrder.table;

          if (targetOrder) {
            const targetValidation = this.validateOrder(targetOrder);
            if (targetValidation) {
              return targetValidation;
            }

            const targetTypeValidation = this.validateOrderType(targetOrder);
            if (targetTypeValidation) {
              return targetTypeValidation;
            }

            if (onTargetOccupied !== 'merge') {
              return {
                ok: false as const,
                code: OrderErrorCodes.ORDER_MOVE_TARGET_OCCUPIED,
                message: 'ORDER_MOVE_TARGET_OCCUPIED',
              };
            }

            await this.mergeIntoTarget(queryRunner, sourceOrder, targetOrder);
            this.ensureOldTableScope(queryRunner, oldTable, restaurantId);

            return {
              ok: true as const,
              value: {
                finalOrderId: targetOrder.id,
                oldTable,
                newTable,
              },
            };
          }

          await this.moveOrder(queryRunner, sourceOrder, newTable.id);
          this.ensureOldTableScope(queryRunner, oldTable, restaurantId);

          return {
            ok: true as const,
            value: {
              finalOrderId: sourceOrder.id,
              oldTable,
              newTable,
            },
          };
        },
      );

      if (!result.ok) {
        return result;
      }

      const finalOrder = await this.loadFinalOrder(result.value.finalOrderId);
      if (!finalOrder) {
        return {
          ok: false,
          code: OrderErrorCodes.ORDER_NOT_FOUND,
          message: 'Order not found after move.',
        };
      }

      this.sendNotifications(
        restaurantId,
        result.value.oldTable,
        result.value.newTable,
        finalOrder,
      );

      return { ok: true, value: finalOrder };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          step: 'move_order.failed',
          orderId,
          newTableId,
          restaurantId,
          message: (error as Error)?.message,
        }),
      );

      const message = (error as Error)?.message || 'ORDER_BAD_REQUEST';

      if (message.includes('could not obtain lock')) {
        return {
          ok: false,
          code: OrderErrorCodes.ORDER_LOCK_TIMEOUT,
          message,
        };
      }

      return {
        ok: false,
        code: OrderErrorCodes.ORDER_BAD_REQUEST,
        message,
      };
    }
  }

  private async getOrder(
    qr: QueryRunner,
    orderId: string,
    restaurantId: string,
  ): Promise<Order | null> {
    const order = await qr.manager.findOne(Order, {
      where: { id: orderId, restaurantId },
      lock: { mode: 'pessimistic_write' },
    });

    if (order?.tableId) {
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
  ): Promise<Table | null> {
    const existingTable = await qr.manager.findOne(Table, {
      where: { id: tableId },
      select: ['id', 'restaurant_id', 'status'],
    });

    if (!existingTable) return null;

    if (existingTable.restaurant_id !== restaurantId) {
      throw new Error(OrderErrorCodes.ORDER_MOVE_CROSS_BRANCH_NOT_ALLOWED);
    }

    const table = await qr.manager.findOne(Table, {
      where: { id: tableId, restaurant_id: restaurantId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!table) return null;

    if (table.status === TableStatus.OUT_OF_SERVICE) {
      throw new Error('Target table is out of service.');
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

  private validateOrder(order: Order) {
    if ([OrderStatus.PAID, OrderStatus.CANCELLED].includes(order.status)) {
      return {
        ok: false as const,
        code: OrderErrorCodes.ORDER_TERMINAL_STATE,
        message: `Order cannot be moved (${order.status}).`,
      };
    }
    if (order.mergedInto) {
      return {
        ok: false as const,
        code: OrderErrorCodes.ORDER_ALREADY_MERGED,
        message: 'Order already merged.',
      };
    }
    return null;
  }

  private validateOrderType(order: Order) {
    if (order.type !== OrderType.DINE_IN) {
      return {
        ok: false as const,
        code: OrderErrorCodes.ORDER_MOVE_NOT_ALLOWED_FOR_TYPE,
        message: 'ORDER_MOVE_NOT_ALLOWED_FOR_TYPE',
      };
    }
    return null;
  }

  private validateTableChange(order: Order, table: Table) {
    if (order.tableId === table.id) {
      return {
        ok: false as const,
        code: OrderErrorCodes.ORDER_BAD_REQUEST,
        message: 'Order already on this table.',
      };
    }
    return null;
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

  private ensureOldTableScope(
    qr: QueryRunner,
    table: Table | null,
    restaurantId: string,
  ): void {
    void qr;
    if (table && table.restaurant_id !== restaurantId) {
      throw new Error(OrderErrorCodes.ORDER_MOVE_CROSS_BRANCH_NOT_ALLOWED);
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

  private async loadFinalOrder(orderId: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.menuItem', 'table', 'user'],
    });
  }
}
