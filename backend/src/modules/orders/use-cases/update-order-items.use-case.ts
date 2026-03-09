import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EffectiveMenuResolverService } from '../../menus/services/effective-menu-resolver.service';
import { OrderItem } from '../entities/order-item.entity';
import { Order, OrderStatus, OrderType } from '../entities/order.entity';
import { OrderErrorCodes } from '../errors/order-error-codes';
import { OrderUseCaseResult } from '../interfaces/order-use-case-result.interface';
import { calculateOrderTotalFromItems } from '../utils/order-total.util';

@Injectable()
export class UpdateOrderItemsUseCase {
  private readonly logger = new Logger(UpdateOrderItemsUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly effectiveMenuResolverService: EffectiveMenuResolverService,
  ) {}

  async execute(params: {
    orderId: string;
    restaurantId: string;
    items: Array<{ menu_item_id: string; quantity: number }>;
    notes?: string;
    type?: OrderType;
    customer_id?: string;
    address?: string;
  }): Promise<
    OrderUseCaseResult<{
      orderId: string;
      previousStatus: OrderStatus;
      nextStatus: OrderStatus;
    }>
  > {
    const { orderId, restaurantId, items, notes, type, customer_id, address } =
      params;

    try {
      return await this.dataSource.transaction(async (manager) => {
        this.logger.debug(
          JSON.stringify({
            step: 'update_order_items.start',
            orderId,
            restaurantId,
          }),
        );

        const order = await manager.findOne(Order, {
          where: { id: orderId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!order) {
          return {
            ok: false,
            code: OrderErrorCodes.ORDER_NOT_FOUND,
            message: 'Order not found',
          };
        }

        if (order.restaurantId !== restaurantId) {
          return {
            ok: false,
            code: OrderErrorCodes.ORDER_SCOPE_FORBIDDEN,
            message: 'Order scope forbidden',
          };
        }

        if (
          order.status === OrderStatus.PAID ||
          order.status === OrderStatus.CANCELLED
        ) {
          return {
            ok: false,
            code: OrderErrorCodes.ORDER_TERMINAL_STATE,
            message: 'Order cannot be modified',
          };
        }

        const previousStatus = order.status;

        if (notes !== undefined) order.notes = notes;
        if (type !== undefined) order.type = type;
        if (customer_id !== undefined) order.customerId = customer_id;
        if (address !== undefined) order.address = address;

        const requestedQuantities = this.normalizeRequestedItems(items);
        const requestedMenuIds = [...requestedQuantities.keys()];

        const existingItems = await manager
          .createQueryBuilder(OrderItem, 'orderItem')
          .setLock('pessimistic_write')
          .where('orderItem.order_id = :orderId', { orderId })
          .orderBy('orderItem.created_at', 'ASC')
          .getMany();

        const resolvedItems =
          await this.effectiveMenuResolverService.resolveManyForBranch({
            branchId: restaurantId,
            menuItemIds: requestedMenuIds,
          });

        if (requestedMenuIds.length > 0) {
          const missingMenuIds = requestedMenuIds.filter(
            (menuId) => !resolvedItems.has(menuId),
          );
          if (missingMenuIds.length > 0) {
            return {
              ok: false,
              code: OrderErrorCodes.ORDER_NOT_FOUND,
              message: `Menu item with ID ${missingMenuIds[0]} not found in this branch scope`,
            };
          }

          const hiddenMenuIds = requestedMenuIds.filter(
            (menuId) => !resolvedItems.get(menuId)?.isVisible,
          );
          if (hiddenMenuIds.length > 0) {
            return {
              ok: false,
              code: OrderErrorCodes.ORDER_ITEM_MENU_NOT_VISIBLE,
              message: `Menu item with ID ${hiddenMenuIds[0]} is hidden or unavailable for this branch`,
            };
          }
        }

        const mutableItemsByMenuId = new Map<string, OrderItem[]>();
        const protectedItems = existingItems.filter((existingItem) =>
          this.isProtectedItemStatus(existingItem.status),
        );
        const protectedQtyByMenuId = new Map<string, number>();
        const mutableItems = existingItems.filter(
          (existingItem) => !this.isProtectedItemStatus(existingItem.status),
        );

        protectedItems.forEach((existingItem) => {
          const currentQty =
            protectedQtyByMenuId.get(existingItem.menuItemId) ?? 0;
          protectedQtyByMenuId.set(
            existingItem.menuItemId,
            currentQty + Number(existingItem.quantity || 0),
          );
        });

        mutableItems.forEach((existingItem) => {
          const current =
            mutableItemsByMenuId.get(existingItem.menuItemId) ?? [];
          current.push(existingItem);
          mutableItemsByMenuId.set(existingItem.menuItemId, current);
        });

        const itemsToSave: OrderItem[] = [...protectedItems];
        const itemsToDelete: OrderItem[] = [];
        const handledMenuIds = new Set<string>();
        let hasNewItems = false;

        for (const [
          menuItemId,
          requestedQty,
        ] of requestedQuantities.entries()) {
          handledMenuIds.add(menuItemId);
          const pool = mutableItemsByMenuId.get(menuItemId) ?? [];
          const protectedQty = protectedQtyByMenuId.get(menuItemId) ?? 0;
          let remainingRequestedQty = Math.max(0, requestedQty - protectedQty);

          for (const existingItem of pool) {
            if (remainingRequestedQty <= 0) {
              itemsToDelete.push(existingItem);
              continue;
            }

            if (existingItem.quantity <= remainingRequestedQty) {
              itemsToSave.push(existingItem);
              remainingRequestedQty -= existingItem.quantity;
              continue;
            }

            existingItem.quantity = remainingRequestedQty;
            existingItem.totalPrice =
              Number(existingItem.unitPrice) * remainingRequestedQty;
            itemsToSave.push(existingItem);
            remainingRequestedQty = 0;
          }

          if (remainingRequestedQty > 0) {
            const resolved = resolvedItems.get(menuItemId)!;
            const unitPrice = Number(resolved.effectivePrice);
            const newItem = manager.create(OrderItem, {
              orderId: order.id,
              menuItemId,
              quantity: remainingRequestedQty,
              unitPrice,
              basePrice: resolved.basePrice,
              overridePrice: resolved.customPrice,
              unitPriceLocked: unitPrice,
              totalPrice: unitPrice * remainingRequestedQty,
              status: OrderStatus.PENDING,
            });
            itemsToSave.push(newItem);
            hasNewItems = true;
          }
        }

        for (const [menuItemId, pool] of mutableItemsByMenuId.entries()) {
          if (handledMenuIds.has(menuItemId)) continue;
          itemsToDelete.push(...pool);
        }

        if (itemsToDelete.length > 0) {
          await manager.remove(OrderItem, itemsToDelete);
        }

        if (itemsToSave.length > 0) {
          await manager.save(OrderItem, itemsToSave);
        }

        const finalItems = await manager.find(OrderItem, {
          where: { orderId: order.id },
        });
        const totalAmount = calculateOrderTotalFromItems(finalItems);

        order.totalAmount = totalAmount;
        if (hasNewItems && order.status !== OrderStatus.PENDING) {
          order.status = OrderStatus.PENDING;
        }
        await manager.save(order);

        return {
          ok: true,
          value: {
            orderId: order.id,
            previousStatus,
            nextStatus: order.status,
          },
        };
      });
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          step: 'update_order_items.failed',
          orderId,
          restaurantId,
          message: (error as Error)?.message,
        }),
      );

      const message = (error as Error)?.message || 'ORDER_BAD_REQUEST';
      const code = message.includes('could not obtain lock')
        ? OrderErrorCodes.ORDER_LOCK_TIMEOUT
        : OrderErrorCodes.ORDER_BAD_REQUEST;

      return {
        ok: false,
        code,
        message,
      };
    }
  }

  private isProtectedItemStatus(status: OrderStatus): boolean {
    return (
      status === OrderStatus.SERVED ||
      status === OrderStatus.DELIVERED ||
      status === OrderStatus.PAID ||
      status === OrderStatus.CANCELLED
    );
  }

  private normalizeRequestedItems(
    items: Array<{ menu_item_id: string; quantity: number }>,
  ): Map<string, number> {
    const normalized = new Map<string, number>();

    for (const item of items) {
      if (!item?.menu_item_id || !Number.isFinite(item.quantity)) continue;
      if (item.quantity <= 0) continue;

      const current = normalized.get(item.menu_item_id) ?? 0;
      normalized.set(item.menu_item_id, current + item.quantity);
    }

    return normalized;
  }
}
