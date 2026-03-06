import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  Order,
  OrderStatus,
  OrderType,
  OrderSource,
} from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { Table, TableStatus } from '../tables/entities/table.entity';
import { MoveOrderUseCase } from './use-cases/move-order.use-case';
import { RulesService } from '../rules/rules.service';
import { RuleKey } from '../rules/enums/rule-key.enum';
import { User } from '../users/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../audit/utils/sanitize-audit.util';
import { EffectiveMenuResolverService } from '../menus/services/effective-menu-resolver.service';
import { calculateOrderTotalFromItems } from './utils/order-total.util';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    private readonly dataSource: DataSource,
    private notificationsGateway: NotificationsGateway,
    private readonly moveOrderUseCase: MoveOrderUseCase,
    private readonly rulesService: RulesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
    private readonly effectiveMenuResolverService: EffectiveMenuResolverService,
  ) {}

  private buildActorName(actor?: User): string | undefined {
    if (!actor?.first_name) {
      return undefined;
    }
    return `${actor.first_name} ${actor.last_name || ''}`.trim();
  }

  private async emitDomainAudit(params: {
    action: AuditAction;
    restaurantId?: string;
    payload?: Record<string, unknown>;
    changes?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      meta?: Record<string, unknown>;
    };
    actor?: User;
    request?: Request;
    context: string;
  }): Promise<void> {
    const headerUserAgent = params.request?.headers?.['user-agent'];
    const userAgent =
      typeof headerUserAgent === 'string'
        ? headerUserAgent
        : headerUserAgent?.[0];

    await this.auditService.safeEmitLog(
      {
        action: params.action,
        resource: 'ORDERS',
        user_id: params.actor?.id,
        user_name: this.buildActorName(params.actor),
        restaurant_id: params.restaurantId,
        payload: params.payload,
        changes: params.changes,
        ip_address: params.request?.ip,
        user_agent: userAgent,
      },
      params.context,
    );
    this.auditService.markRequestAsAudited(
      params.request as unknown as Record<string, unknown>,
    );
  }

  async findAll(
    restaurantId: string,
    status?: string,
    waiterId?: string,
    type?: string,
    tableId?: string,
    limit?: number,
  ): Promise<Order[]> {
    const where: any = {};
    where.restaurantId = restaurantId;

    if (status) {
      const statuses = status
        .split(',')
        .filter((s) => s.trim() !== '') as OrderStatus[];
      if (statuses.length > 0) {
        where.status = In(statuses);
      }
    }

    if (waiterId) {
      where.userId = waiterId;
    }

    if (type) {
      const types = type
        .split(',')
        .filter((t) => t.trim() !== '') as OrderType[];
      if (types.length > 0) {
        where.type = In(types);
      }
    }

    if (tableId) {
      where.tableId = tableId;
    }

    const orders = await this.ordersRepository.find({
      where,
      relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
      order: { created_at: 'DESC' } as any,
      ...(limit && Number.isFinite(limit) && limit > 0 ? { take: limit } : {}),
    });

    return orders;
  }

  async create(
    createOrderDto: CreateOrderDto,
    user: User,
    request?: Request,
  ): Promise<Order> {
    const {
      table_id,
      items,
      notes,
      type,
      source,
      external_id,
      customer_id,
      address,
      delivery_fee,
      integration_metadata,
      transaction_id,
    } = createOrderDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, {
        restaurantId: user.restaurant_id,
        tableId: table_id || null,
        userId: user ? user.id : null,
        notes: notes || null,
        status: OrderStatus.PENDING,
        totalAmount: 0,
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        type: type || OrderType.DINE_IN,
        source: source || OrderSource.INTERNAL,
        externalId: external_id || null,
        customerId: customer_id || null,
        address: address || null,
        deliveryFee: delivery_fee || 0,
        integrationMetadata: integration_metadata || null,
      });

      // Business Rule Check: Masa Seçimi Zorunluluğu (Sadece DINE_IN için)
      if (order.type === OrderType.DINE_IN) {
        await this.rulesService.checkRule(
          user.restaurant_id,
          RuleKey.ORDER_MANDATORY_TABLE,
          table_id, // Pass table_id as context
          'Bu sipariş için masa seçilmesi zorunludur.',
        );
        // Business Rule Check: Açık Kasa Zorunluluğu
        await this.rulesService.checkRule(
          user.restaurant_id,
          RuleKey.ORDER_REQUIRE_OPEN_CASH,
          null,
          'Sipariş alabilmek için açık bir kasa oturumu bulunmalıdır.',
        );
      }

      // Check if there's already an active order for this table
      if (table_id) {
        const activeOrder = await queryRunner.manager.findOne(Order, {
          where: {
            tableId: table_id,
            status: In([
              OrderStatus.PENDING,
              OrderStatus.PREPARING,
              OrderStatus.READY,
              OrderStatus.SERVED,
            ]),
          },
        });

        if (activeOrder) {
          throw new BadRequestException(
            'Bu masada zaten açık bir sipariş var. Lütfen mevcut siparişi güncelleyin.',
          );
        }

        // Masa durumunu güncelle
        const table = await queryRunner.manager.findOne(Table, {
          where: { id: table_id },
          lock: { mode: 'pessimistic_write' },
        });
        if (table && table.status !== TableStatus.OCCUPIED) {
          table.status = TableStatus.OCCUPIED;
          await queryRunner.manager.save(table);
        }
      }

      const savedOrder = await queryRunner.manager.save(order);

      const requestedMenuIds = [
        ...new Set(items.map((item) => item.menu_item_id)),
      ];
      const resolvedItems =
        await this.effectiveMenuResolverService.resolveManyForBranch({
          branchId: user.restaurant_id,
          menuItemIds: requestedMenuIds,
        });

      const orderItemsToSave: OrderItem[] = [];
      for (const itemDto of items) {
        const resolved = resolvedItems.get(itemDto.menu_item_id);
        if (!resolved) {
          throw new NotFoundException(
            `Menu item with ID ${itemDto.menu_item_id} not found`,
          );
        }
        if (!resolved.isVisible) {
          throw new BadRequestException(
            `Menu item with ID ${itemDto.menu_item_id} is hidden or unavailable for this branch`,
          );
        }

        const subtotal = resolved.effectivePrice * itemDto.quantity;

        const orderItem = queryRunner.manager.create(OrderItem, {
          orderId: savedOrder.id,
          menuItemId: itemDto.menu_item_id,
          quantity: itemDto.quantity,
          unitPrice: resolved.effectivePrice,
          basePrice: resolved.basePrice,
          overridePrice: resolved.customPrice,
          unitPriceLocked: resolved.effectivePrice,
          totalPrice: subtotal,
        });
        orderItemsToSave.push(orderItem);
      }

      if (orderItemsToSave.length > 0) {
        await queryRunner.manager.save(orderItemsToSave);
      }

      savedOrder.totalAmount = calculateOrderTotalFromItems(orderItemsToSave);
      await queryRunner.manager.save(savedOrder);

      await queryRunner.commitTransaction();

      const finalOrder = await this.findOne(savedOrder.id);
      this.notificationsGateway.notifyNewOrder(
        user.restaurant_id,
        finalOrder,
        transaction_id,
      );
      this.eventEmitter.emit('order.dashboard.changed', {
        restaurantId: user.restaurant_id,
        reason: 'order',
      });
      await this.calculateAndNotifyKitchenLoad(user.restaurant_id).catch(
        (error) => {
          console.error(
            '[OrdersService] Failed to notify kitchen load after create:',
            error,
          );
        },
      );

      await this.emitDomainAudit({
        action: AuditAction.ORDER_CREATED,
        restaurantId: user.restaurant_id,
        payload: {
          orderId: finalOrder.id,
          transactionId: transaction_id,
        },
        changes: sanitizeAuditChanges({
          after: {
            id: finalOrder.id,
            status: finalOrder.status,
            totalAmount: Number(finalOrder.totalAmount),
            itemCount: finalOrder.items?.length || 0,
            tableId: finalOrder.tableId || null,
          },
        }),
        actor: user,
        request,
        context: 'OrdersService.create',
      });

      return finalOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllByRestaurant(restaurantId: string): Promise<Order[]> {
    const orders = await this.ordersRepository.find({
      where: { restaurantId },
      relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
      order: { created_at: 'DESC' } as any,
    });
    return orders;
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    transactionId?: string,
    actor?: User,
    request?: Request,
  ): Promise<Order> {
    const order = await this.findOne(id);
    const previousStatus = order.status;

    // Validate status transition
    if (!this._isValidStatusTransition(order.status, status)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${status}`,
      );
    }

    // Business Rule Check: Onaylı Sipariş İptal Kısıtı
    if (status === OrderStatus.CANCELLED) {
      await this.rulesService.checkRule(
        order.restaurantId,
        RuleKey.ORDER_PREVENT_VOID,
        order, // Pass order object as context
        'Hazırlık aşamasına geçmiş siparişler iptal edilemez. Lütfen yöneticiye danışın.',
      );
    }

    order.status = status;

    // Update only transition-eligible items to match order status.
    if (order.items && order.items.length > 0) {
      try {
        const itemIds = order.items
          .filter((item) =>
            this._shouldUpdateItemForOrderTransition(item.status, status),
          )
          .map((item) => item.id);
        if (itemIds.length > 0) {
          await this.orderItemsRepository
            .createQueryBuilder()
            .update()
            .set({ status: status })
            .where('id IN (:...itemIds)', { itemIds })
            .execute();
        }
      } catch (itemError) {
        // Log but continue - order status update is more important
        console.error('Failed to update order items:', itemError);
      }
    }

    // IMPORTANT:
    // Order entity has items relation with cascade enabled. Saving the loaded
    // order entity can accidentally re-persist stale item snapshots and revert
    // freshly updated item statuses. Update only the order status column.
    await this.ordersRepository.update(order.id, { status: order.status });
    const finalOrder = await this.findOne(order.id);

    // Eğer sipariş ödendi veya iptal edildiyse, masa durumunu kontrol et
    if (
      order.tableId &&
      (status === OrderStatus.PAID || status === OrderStatus.CANCELLED)
    ) {
      const activeOrdersCount = await this.ordersRepository.count({
        where: {
          tableId: order.tableId,
          restaurantId: order.restaurantId,
          status: In([
            OrderStatus.PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
          ]),
        },
      });

      if (activeOrdersCount === 0) {
        const table = await this.dataSource
          .getRepository(Table)
          .findOneBy({ id: order.tableId });
        if (table && table.status === TableStatus.OCCUPIED) {
          table.status = TableStatus.AVAILABLE;
          await this.dataSource.getRepository(Table).save(table);

          // Masa durumu güncellendi bildirimi gönder
          this.notificationsGateway.notifyOrderStatus(
            order.restaurantId,
            table,
          );
        }
      }
    }

    this.notificationsGateway.notifyOrderStatus(
      order.restaurantId,
      finalOrder,
      transactionId,
      previousStatus !== finalOrder.status
        ? {
            oldStatus: previousStatus,
            newStatus: finalOrder.status,
          }
        : undefined,
    );
    this.eventEmitter.emit('order.dashboard.changed', {
      restaurantId: order.restaurantId,
      reason: 'order',
    });
    await this.calculateAndNotifyKitchenLoad(order.restaurantId).catch(
      (error) => {
        console.error(
          '[OrdersService] Failed to notify kitchen load after updateStatus:',
          error,
        );
      },
    );

    await this.emitDomainAudit({
      action: AuditAction.ORDER_STATUS_UPDATED,
      restaurantId: order.restaurantId,
      payload: {
        orderId: finalOrder.id,
        transactionId,
      },
      changes: sanitizeAuditChanges({
        before: { status: previousStatus },
        after: { status: finalOrder.status },
      }),
      actor,
      request,
      context: 'OrdersService.updateStatus',
    });
    return finalOrder;
  }

  async batchUpdateStatus(
    orderIds: string[],
    status: OrderStatus,
    transactionId?: string,
    actor?: User,
    request?: Request,
  ): Promise<Order[]> {
    if (!orderIds.length) return [];

    // Fetch all orders in one query
    const orders = await this.ordersRepository.find({
      where: { id: In(orderIds) },
      relations: ['items', 'table', 'user', 'customer'],
    });

    if (!orders.length) return [];
    const previousStatusesByOrderId = new Map(
      orders.map((order) => [order.id, order.status]),
    );

    for (const order of orders) {
      if (!this._isValidStatusTransition(order.status, status)) {
        throw new BadRequestException(
          `Invalid status transition for order ${order.id}: ${order.status} -> ${status}`,
        );
      }
    }

    // --- Business rule: cancel restriction ---
    if (status === OrderStatus.CANCELLED) {
      for (const order of orders) {
        await this.rulesService.checkRule(
          order.restaurantId,
          RuleKey.ORDER_PREVENT_VOID,
          order,
          'Hazırlık aşamasına geçmiş siparişler iptal edilemez.',
        );
      }
    }

    // --- Bulk update order statuses ---
    await this.ordersRepository
      .createQueryBuilder()
      .update()
      .set({ status })
      .where('id IN (:...orderIds)', { orderIds })
      .execute();

    // --- Bulk update order item statuses (only transition-eligible rows) ---
    const allItemIds = orders.flatMap(
      (o) =>
        o.items
          ?.filter((i) =>
            this._shouldUpdateItemForOrderTransition(i.status, status),
          )
          .map((i) => i.id) ?? [],
    );
    if (allItemIds.length > 0) {
      await this.orderItemsRepository
        .createQueryBuilder()
        .update()
        .set({ status })
        .where('id IN (:...allItemIds)', { allItemIds })
        .execute();
    }

    // --- Handle table status for terminal statuses (PAID / CANCELLED) ---
    if (status === OrderStatus.PAID || status === OrderStatus.CANCELLED) {
      // Collect unique tableIds
      const tableIds = [
        ...new Set(orders.map((o) => o.tableId).filter(Boolean) as string[]),
      ];
      const restaurantId = orders[0].restaurantId;

      for (const tableId of tableIds) {
        const activeCount = await this.ordersRepository.count({
          where: {
            tableId,
            restaurantId,
            status: In([
              OrderStatus.PENDING,
              OrderStatus.PREPARING,
              OrderStatus.READY,
              OrderStatus.SERVED,
            ]),
          },
        });

        if (activeCount === 0) {
          const table = await this.dataSource
            .getRepository(Table)
            .findOneBy({ id: tableId });
          if (table && table.status === TableStatus.OCCUPIED) {
            table.status = TableStatus.AVAILABLE;
            await this.dataSource.getRepository(Table).save(table);
            this.notificationsGateway.notifyOrderStatus(restaurantId, table);
          }
        }
      }
    }

    // --- Fetch updated orders and emit notifications ---
    const updatedOrders = await this.ordersRepository.find({
      where: { id: In(orderIds) },
      relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
    });

    const restaurantId = updatedOrders[0]?.restaurantId;
    if (restaurantId) {
      // Single notification per update batch (not per order)
      updatedOrders.forEach((o) =>
        this.notificationsGateway.notifyOrderStatus(
          restaurantId,
          o,
          transactionId,
          previousStatusesByOrderId.get(o.id) !== o.status
            ? {
                oldStatus: previousStatusesByOrderId.get(o.id),
                newStatus: o.status,
              }
            : undefined,
        ),
      );
      this.eventEmitter.emit('order.dashboard.changed', {
        restaurantId,
        reason: 'order',
      });
      await this.calculateAndNotifyKitchenLoad(restaurantId).catch((error) => {
        console.error(
          '[OrdersService] Failed to notify kitchen load after batchUpdateStatus:',
          error,
        );
      });

      await this.emitDomainAudit({
        action: AuditAction.ORDER_STATUS_BATCH_UPDATED,
        restaurantId,
        payload: {
          transactionId,
        },
        changes: {
          meta: {
            operation: 'batch_status_update',
            itemCount: orderIds.length,
            affectedCount: updatedOrders.length,
            failedIds: orderIds.filter(
              (orderId) => !updatedOrders.find((item) => item.id === orderId),
            ),
            context: {
              targetStatus: status,
            },
          },
        },
        actor,
        request,
        context: 'OrdersService.batchUpdateStatus',
      });
    }

    return updatedOrders;
  }

  async moveOrder(
    orderId: string,
    newTableId: string,
    restaurantId: string,
    onTargetOccupied: 'reject' | 'merge' = 'reject',
    actor?: User,
    request?: Request,
  ): Promise<Order> {
    const beforeOrder = await this.findOne(orderId);
    const movedOrder = await this.moveOrderUseCase.execute(
      orderId,
      newTableId,
      restaurantId,
      onTargetOccupied,
    );
    await this.emitDomainAudit({
      action: AuditAction.ORDER_MOVED_TO_TABLE,
      restaurantId,
      payload: { orderId: movedOrder.id },
      changes: sanitizeAuditChanges({
        before: { tableId: beforeOrder.tableId || null },
        after: { tableId: movedOrder.tableId || null },
      }),
      actor,
      request,
      context: 'OrdersService.moveOrder',
    });
    return movedOrder;
  }

  async updateItems(
    id: string,
    items: any[],
    restaurantId: string,
    notes?: string,
    type?: OrderType,
    customer_id?: string,
    address?: string,
    transaction_id?: string,
    actor?: User,
    request?: Request,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await this._validateOrderForUpdate(queryRunner, id);
      const beforeSnapshot = {
        status: order.status,
        totalAmount: Number(order.totalAmount || 0),
      };
      const previousStatus = order.status;
      let hasNewItems = false;

      // Ensure the order belongs to the authenticated restaurant
      if (order.restaurantId !== restaurantId) {
        throw new BadRequestException(
          `Order with ID ${id} does not belong to restaurant ${restaurantId}`,
        );
      }

      // Update order details if provided
      if (notes !== undefined) order.notes = notes;
      if (type !== undefined) order.type = type;
      if (customer_id !== undefined) order.customerId = customer_id;
      if (address !== undefined) order.address = address;

      const requestedQuantities = this._normalizeRequestedItems(items);
      const requestedMenuIds = [...requestedQuantities.keys()];

      const existingItems = await queryRunner.manager
        .createQueryBuilder(OrderItem, 'orderItem')
        .setLock('pessimistic_write')
        .where('orderItem.order_id = :orderId', { orderId: id })
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
          throw new NotFoundException(
            `Menu item with ID ${missingMenuIds[0]} not found in this branch scope`,
          );
        }

        const hiddenMenuIds = requestedMenuIds.filter(
          (menuId) => !resolvedItems.get(menuId)?.isVisible,
        );
        if (hiddenMenuIds.length > 0) {
          throw new BadRequestException(
            `Menu item with ID ${hiddenMenuIds[0]} is hidden or unavailable for this branch`,
          );
        }
      }

      const mutableItemsByMenuId = new Map<string, OrderItem[]>();
      const protectedItems = existingItems.filter((existingItem) =>
        this._isProtectedItemStatus(existingItem.status),
      );
      const protectedQtyByMenuId = new Map<string, number>();
      const mutableItems = existingItems.filter(
        (existingItem) => !this._isProtectedItemStatus(existingItem.status),
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
        const current = mutableItemsByMenuId.get(existingItem.menuItemId) ?? [];
        current.push(existingItem);
        mutableItemsByMenuId.set(existingItem.menuItemId, current);
      });

      const itemsToSave: OrderItem[] = [...protectedItems];
      const itemsToDelete: OrderItem[] = [];
      const handledMenuIds = new Set<string>();

      for (const [menuItemId, requestedQty] of requestedQuantities.entries()) {
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
          const newItem = queryRunner.manager.create(OrderItem, {
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
        await queryRunner.manager.remove(OrderItem, itemsToDelete);
      }

      if (itemsToSave.length > 0) {
        await queryRunner.manager.save(OrderItem, itemsToSave);
      }

      const finalItems = await queryRunner.manager.find(OrderItem, {
        where: { orderId: order.id },
      });
      const totalAmount = calculateOrderTotalFromItems(finalItems);

      order.totalAmount = totalAmount;
      if (hasNewItems && order.status !== OrderStatus.PENDING) {
        order.status = OrderStatus.PENDING;
      }
      const updatedOrder = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      const finalOrder = await this.findOne(updatedOrder.id);
      this.notificationsGateway.notifyOrderStatus(
        restaurantId,
        finalOrder,
        transaction_id,
        previousStatus !== finalOrder.status
          ? {
              oldStatus: previousStatus,
              newStatus: finalOrder.status,
            }
          : undefined,
      );
      this.eventEmitter.emit('order.dashboard.changed', {
        restaurantId,
        reason: 'order',
      });
      await this.calculateAndNotifyKitchenLoad(restaurantId).catch((error) => {
        console.error(
          '[OrdersService] Failed to notify kitchen load after updateItems:',
          error,
        );
      });

      await this.emitDomainAudit({
        action: AuditAction.ORDER_ITEMS_UPDATED,
        restaurantId,
        payload: {
          orderId: finalOrder.id,
          transactionId: transaction_id,
        },
        changes: sanitizeAuditChanges({
          before: beforeSnapshot,
          after: {
            status: finalOrder.status,
            totalAmount: Number(finalOrder.totalAmount),
            itemCount: finalOrder.items?.length || 0,
          },
        }),
        actor,
        request,
        context: 'OrdersService.updateItems',
      });

      return finalOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async _validateOrderForUpdate(
    queryRunner: any,
    orderId: string,
  ): Promise<Order> {
    const order = await queryRunner.manager.findOne(Order, {
      where: { id: orderId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException('Order cannot be modified');
    }
    return order;
  }

  private _isValidStatusTransition(
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

  private _isProtectedItemStatus(status: OrderStatus): boolean {
    return (
      status === OrderStatus.SERVED ||
      status === OrderStatus.DELIVERED ||
      status === OrderStatus.PAID ||
      status === OrderStatus.CANCELLED
    );
  }

  private _shouldUpdateItemForOrderTransition(
    itemStatus: OrderStatus,
    targetOrderStatus: OrderStatus,
  ): boolean {
    // Immutable terminal item states must never be rewritten.
    if (
      itemStatus === OrderStatus.SERVED ||
      itemStatus === OrderStatus.DELIVERED ||
      itemStatus === OrderStatus.PAID ||
      itemStatus === OrderStatus.CANCELLED
    ) {
      return false;
    }

    // Manual drag to pending should not downgrade any item.
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
      return itemStatus === OrderStatus.READY;
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

  private _normalizeRequestedItems(
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

  private async calculateAndNotifyKitchenLoad(
    restaurantId: string,
  ): Promise<void> {
    const [preparingCount, readyCount] = await Promise.all([
      this.ordersRepository.count({
        where: {
          restaurantId,
          status: OrderStatus.PREPARING,
        },
      }),
      this.ordersRepository.count({
        where: {
          restaurantId,
          status: OrderStatus.READY,
        },
      }),
    ]);

    const activeLoad = preparingCount + readyCount;
    const totalCapacity = Math.max(1, Math.ceil(activeLoad / 0.7));
    const loadPercentage =
      totalCapacity > 0
        ? Math.min(100, Math.round((activeLoad / totalCapacity) * 100))
        : 0;

    this.notificationsGateway.notifyKitchenLoad(restaurantId, {
      preparingCount,
      readyCount,
      totalCapacity,
      loadPercentage,
    });
  }
}
