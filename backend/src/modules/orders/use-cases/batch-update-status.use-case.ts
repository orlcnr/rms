import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { RulesService } from '../../rules/rules.service';
import { RuleKey } from '../../rules/enums/rule-key.enum';
import { OrderErrorCodes } from '../errors/order-error-codes';

@Injectable()
export class BatchUpdateStatusUseCase {
  private readonly logger = new Logger(BatchUpdateStatusUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly rulesService: RulesService,
  ) {}

  async execute(params: {
    orderIds: string[];
    targetStatus: OrderStatus;
    restaurantId: string;
  }): Promise<{
    updatedOrderIds: string[];
    failed: Array<{ orderId: string; code: string; message: string }>;
    restaurantId?: string;
  }> {
    const { orderIds, targetStatus, restaurantId } = params;

    if (!orderIds.length) {
      return { updatedOrderIds: [], failed: [] };
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const orders = await manager.find(Order, {
          where: { id: In(orderIds) },
          relations: ['items', 'table', 'user', 'customer'],
          lock: { mode: 'pessimistic_write' },
        });

        const failed: Array<{
          orderId: string;
          code: string;
          message: string;
        }> = [];
        const eligibleOrders: Order[] = [];

        for (const orderId of orderIds) {
          const order = orders.find((item) => item.id === orderId);
          if (!order) {
            failed.push({
              orderId,
              code: OrderErrorCodes.ORDER_NOT_FOUND,
              message: 'Order not found',
            });
            continue;
          }

          if (order.restaurantId !== restaurantId) {
            failed.push({
              orderId,
              code: OrderErrorCodes.ORDER_SCOPE_FORBIDDEN,
              message: 'Order scope forbidden',
            });
            continue;
          }

          if (!this.isValidStatusTransition(order.status, targetStatus)) {
            failed.push({
              orderId,
              code: OrderErrorCodes.ORDER_INVALID_STATUS_TRANSITION,
              message: `Invalid status transition: ${order.status} -> ${targetStatus}`,
            });
            continue;
          }

          if (targetStatus === OrderStatus.CANCELLED) {
            try {
              await this.rulesService.checkRule(
                order.restaurantId,
                RuleKey.ORDER_PREVENT_VOID,
                order,
                'Hazırlık aşamasına geçmiş siparişler iptal edilemez.',
              );
            } catch (error) {
              failed.push({
                orderId,
                code: OrderErrorCodes.ORDER_BAD_REQUEST,
                message: (error as Error)?.message || 'Rule check failed',
              });
              continue;
            }
          }

          eligibleOrders.push(order);
        }

        const eligibleOrderIds = eligibleOrders.map((order) => order.id);
        if (eligibleOrderIds.length > 0) {
          await manager
            .createQueryBuilder()
            .update(Order)
            .set({ status: targetStatus })
            .where('id IN (:...orderIds)', { orderIds: eligibleOrderIds })
            .execute();

          const itemIds = eligibleOrders.flatMap((order) =>
            (order.items || [])
              .filter((item) =>
                this.shouldUpdateItemForOrderTransition(
                  item.status,
                  targetStatus,
                ),
              )
              .map((item) => item.id),
          );

          if (itemIds.length > 0) {
            await manager
              .createQueryBuilder()
              .update(OrderItem)
              .set({ status: targetStatus })
              .where('id IN (:...itemIds)', { itemIds })
              .execute();
          }
        }

        return {
          updatedOrderIds: eligibleOrderIds,
          failed,
          restaurantId,
        };
      });
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          step: 'batch_update_status.failed',
          targetStatus,
          orderCount: orderIds.length,
          message: (error as Error)?.message,
        }),
      );

      return {
        updatedOrderIds: [],
        failed: orderIds.map((orderId) => ({
          orderId,
          code: (error as Error)?.message?.includes('could not obtain lock')
            ? OrderErrorCodes.ORDER_LOCK_TIMEOUT
            : OrderErrorCodes.ORDER_BAD_REQUEST,
          message: (error as Error)?.message || 'Batch update failed',
        })),
      };
    }
  }

  private isValidStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): boolean {
    if (currentStatus === newStatus) {
      return true;
    }

    if (
      currentStatus === OrderStatus.PAID ||
      currentStatus === OrderStatus.CANCELLED
    ) {
      return false;
    }

    return true;
  }

  private shouldUpdateItemForOrderTransition(
    itemStatus: OrderStatus,
    targetOrderStatus: OrderStatus,
  ): boolean {
    if (
      itemStatus === OrderStatus.SERVED ||
      itemStatus === OrderStatus.DELIVERED ||
      itemStatus === OrderStatus.PAID ||
      itemStatus === OrderStatus.CANCELLED
    ) {
      return false;
    }

    if (targetOrderStatus === OrderStatus.PENDING) {
      return false;
    }

    if (targetOrderStatus === OrderStatus.PREPARING) {
      return itemStatus === OrderStatus.PENDING;
    }

    if (targetOrderStatus === OrderStatus.READY) {
      return itemStatus === OrderStatus.PREPARING;
    }

    if (targetOrderStatus === OrderStatus.SERVED) {
      return (
        itemStatus === OrderStatus.PENDING ||
        itemStatus === OrderStatus.PREPARING ||
        itemStatus === OrderStatus.READY
      );
    }

    if (targetOrderStatus === OrderStatus.PAID) {
      return (
        itemStatus === OrderStatus.PENDING ||
        itemStatus === OrderStatus.PREPARING ||
        itemStatus === OrderStatus.READY
      );
    }

    if (targetOrderStatus === OrderStatus.CANCELLED) {
      return (
        itemStatus === OrderStatus.PENDING ||
        itemStatus === OrderStatus.PREPARING ||
        itemStatus === OrderStatus.READY
      );
    }

    return false;
  }
}
