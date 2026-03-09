import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { DataSource, In, MoreThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateOrderDto } from '../dto/create-order.dto';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { RulesService } from '../../rules/rules.service';
import { RuleKey } from '../../rules/enums/rule-key.enum';
import { User } from '../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';
import { EffectiveMenuResolverService } from '../../menus/services/effective-menu-resolver.service';
import { calculateOrderTotalFromItems } from '../utils/order-total.util';
import { OrderMapper } from '../mappers/order.mapper';
import { OrderResponseDto } from '../dto/order-response.dto';
import { OrdersRepository } from '../repositories/orders.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { MoveOrderUseCase } from '../use-cases/move-order.use-case';
import { UpdateOrderItemsUseCase } from '../use-cases/update-order-items.use-case';
import { BatchUpdateStatusUseCase } from '../use-cases/batch-update-status.use-case';
import { OrderErrorCodes } from '../errors/order-error-codes';
import { OrderUseCaseFailure } from '../interfaces/order-use-case-result.interface';
import {
  Order,
  OrderSource,
  OrderStatus,
  OrderType,
} from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Table, TableStatus } from '../../tables/entities/table.entity';
import { OrdersAuthorizationService } from './orders-authorization.service';
import {
  Reservation,
  ReservationStatus,
} from '../../reservations/entities/reservation.entity';

@Injectable()
export class OrdersCommandService {
  private readonly logger = new Logger(OrdersCommandService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly dataSource: DataSource,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly moveOrderUseCase: MoveOrderUseCase,
    private readonly rulesService: RulesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
    private readonly effectiveMenuResolverService: EffectiveMenuResolverService,
    private readonly updateOrderItemsUseCase: UpdateOrderItemsUseCase,
    private readonly batchUpdateStatusUseCase: BatchUpdateStatusUseCase,
    private readonly ordersAuthorizationService: OrdersAuthorizationService,
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

  private throwFromFailure(failure: OrderUseCaseFailure): never {
    switch (failure.code) {
      case OrderErrorCodes.ORDER_NOT_FOUND:
      case OrderErrorCodes.ORDER_TABLE_NOT_FOUND:
        throw new NotFoundException(failure.message);
      case OrderErrorCodes.ORDER_SCOPE_FORBIDDEN:
        throw new ForbiddenException(failure.message);
      case OrderErrorCodes.ORDER_MOVE_TARGET_OCCUPIED:
        throw new ConflictException(failure.message);
      case OrderErrorCodes.ORDER_MOVE_CROSS_BRANCH_NOT_ALLOWED:
      case OrderErrorCodes.ORDER_MOVE_NOT_ALLOWED_FOR_TYPE:
      case OrderErrorCodes.ORDER_TERMINAL_STATE:
      case OrderErrorCodes.ORDER_INVALID_STATUS_TRANSITION:
      case OrderErrorCodes.ORDER_ITEM_MENU_NOT_VISIBLE:
      case OrderErrorCodes.ORDER_LOCK_TIMEOUT:
      case OrderErrorCodes.ORDER_ALREADY_MERGED:
      case OrderErrorCodes.ORDER_BAD_REQUEST:
      default:
        throw new BadRequestException(failure.message);
    }
  }

  private safeEmitDashboardChanged(restaurantId: string): void {
    try {
      this.eventEmitter.emit('order.dashboard.changed', {
        restaurantId,
        reason: 'order',
      });
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          step: 'event_emit.failed',
          event: 'order.dashboard.changed',
          restaurantId,
          message: (error as Error)?.message,
        }),
      );
    }
  }

  async create(
    createOrderDto: CreateOrderDto,
    user: User,
    request?: Request,
  ): Promise<OrderResponseDto> {
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
      let resolvedCustomerId = customer_id || null;

      // Reservation arrival flow:
      // Only bind customer automatically when reservation is marked ARRIVED recently.
      // This prevents assigning reservation customer when another guest sits at same table.
      if (!resolvedCustomerId && table_id && (type || OrderType.DINE_IN) === OrderType.DINE_IN) {
        const arrivedRecentlyThreshold = new Date(Date.now() - 30 * 60 * 1000);
        const arrivedReservation = await queryRunner.manager.findOne(
          Reservation,
          {
            where: {
              restaurant_id: user.restaurant_id,
              table_id,
              status: ReservationStatus.ARRIVED,
              updated_at: MoreThanOrEqual(arrivedRecentlyThreshold),
            },
            order: {
              updated_at: 'DESC',
            },
          },
        );

        if (arrivedReservation?.customer_id) {
          resolvedCustomerId = arrivedReservation.customer_id;
        }
      }

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
        customerId: resolvedCustomerId,
        address: address || null,
        deliveryFee: delivery_fee || 0,
        integrationMetadata: integration_metadata || null,
      });

      if (order.type === OrderType.DINE_IN) {
        await this.rulesService.checkRule(
          user.restaurant_id,
          RuleKey.ORDER_MANDATORY_TABLE,
          table_id,
          'Bu sipariş için masa seçilmesi zorunludur.',
        );
        await this.rulesService.checkRule(
          user.restaurant_id,
          RuleKey.ORDER_REQUIRE_OPEN_CASH,
          null,
          'Sipariş alabilmek için açık bir kasa oturumu bulunmalıdır.',
        );
      }

      if (table_id) {
        const activeOrder = await queryRunner.manager.findOne(Order, {
          where: {
            tableId: table_id,
            restaurantId: user.restaurant_id,
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

        const table = await queryRunner.manager.findOne(Table, {
          where: { id: table_id, restaurant_id: user.restaurant_id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!table) {
          throw new NotFoundException('Masa bulunamadı');
        }
        if (table.status === TableStatus.OUT_OF_SERVICE) {
          throw new BadRequestException('Masa servis dışı durumda');
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

      const finalOrder = await this.ordersRepository.findOneWithRelations(
        savedOrder.id,
      );
      if (!finalOrder) {
        throw new NotFoundException(OrderErrorCodes.ORDER_NOT_FOUND);
      }

      this.notificationsGateway.notifyNewOrder(
        user.restaurant_id,
        finalOrder,
        transaction_id,
      );
      this.safeEmitDashboardChanged(user.restaurant_id);
      await this.calculateAndNotifyKitchenLoad(user.restaurant_id).catch(
        (error) => {
          this.logger.error(
            JSON.stringify({
              step: 'create.kitchen_load_notify_failed',
              restaurantId: user.restaurant_id,
              message: (error as Error)?.message,
            }),
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
        context: 'OrdersCommandService.create',
      });

      return OrderMapper.toDto(finalOrder);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    transactionId?: string,
    actor?: User,
    request?: Request,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersRepository.findOneWithRelations(id);
    this.ordersAuthorizationService.assertOrderExists(order);
    if (actor?.restaurant_id) {
      this.ordersAuthorizationService.assertOrderRestaurantScope(
        order,
        actor.restaurant_id,
      );
    }

    const previousStatus = order.status;

    if (!this.isValidStatusTransition(order.status, status)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${status}`,
      );
    }

    if (status === OrderStatus.CANCELLED) {
      await this.rulesService.checkRule(
        order.restaurantId,
        RuleKey.ORDER_PREVENT_VOID,
        order,
        'Hazırlık aşamasına geçmiş siparişler iptal edilemez. Lütfen yöneticiye danışın.',
      );
    }

    order.status = status;

    if (order.items && order.items.length > 0) {
      const itemIds = order.items
        .filter((item) =>
          this.shouldUpdateItemForOrderTransition(item.status, status),
        )
        .map((item) => item.id);
      await this.orderItemRepository.updateStatusesByIds(itemIds, status);
    }

    await this.ordersRepository.raw.update(order.id, { status: order.status });
    const finalOrder = await this.ordersRepository.findOneWithRelations(
      order.id,
    );
    if (!finalOrder) {
      throw new NotFoundException(OrderErrorCodes.ORDER_NOT_FOUND);
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
    this.safeEmitDashboardChanged(order.restaurantId);
    await this.calculateAndNotifyKitchenLoad(order.restaurantId).catch(
      (error) => {
        this.logger.error(
          JSON.stringify({
            step: 'update_status.kitchen_load_notify_failed',
            restaurantId: order.restaurantId,
            message: (error as Error)?.message,
          }),
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
      context: 'OrdersCommandService.updateStatus',
    });

    return OrderMapper.toDto(finalOrder);
  }

  async batchUpdateStatus(
    orderIds: string[],
    status: OrderStatus,
    transactionId?: string,
    actor?: User,
    request?: Request,
  ): Promise<{
    updated: OrderResponseDto[];
    failed: Array<{ order_id: string; code: string; message: string }>;
    isPartial: boolean;
  }> {
    const actorRestaurantId = actor?.restaurant_id;
    if (!actorRestaurantId) {
      throw new BadRequestException('Restaurant scope is required');
    }

    const result = await this.batchUpdateStatusUseCase.execute({
      orderIds,
      targetStatus: status,
      restaurantId: actorRestaurantId,
    });

    const updatedOrders = result.updatedOrderIds.length
      ? await this.ordersRepository.raw.find({
          where: { id: In(result.updatedOrderIds) },
          relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
        })
      : [];

    const restaurantId = result.restaurantId || updatedOrders[0]?.restaurantId;

    if (restaurantId) {
      updatedOrders.forEach((order) => {
        this.notificationsGateway.notifyOrderStatus(
          restaurantId,
          order,
          transactionId,
        );
      });

      this.safeEmitDashboardChanged(restaurantId);

      await this.calculateAndNotifyKitchenLoad(restaurantId).catch((error) => {
        this.logger.error(
          JSON.stringify({
            step: 'batch_update_status.kitchen_load_notify_failed',
            restaurantId,
            message: (error as Error)?.message,
          }),
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
            failedIds: result.failed.map((item) => item.orderId),
            context: {
              targetStatus: status,
            },
          },
        },
        actor,
        request,
        context: 'OrdersCommandService.batchUpdateStatus',
      });
    }

    return {
      updated: updatedOrders.map((order) => OrderMapper.toDto(order)),
      failed: result.failed.map((item) => ({
        order_id: item.orderId,
        code: item.code,
        message: item.message,
      })),
      isPartial: result.failed.length > 0 && result.updatedOrderIds.length > 0,
    };
  }

  async moveOrder(
    orderId: string,
    newTableId: string,
    restaurantId: string,
    onTargetOccupied: 'reject' | 'merge' = 'reject',
    actor?: User,
    request?: Request,
  ): Promise<OrderResponseDto> {
    const beforeOrder =
      await this.ordersRepository.findOneWithRelations(orderId);
    this.ordersAuthorizationService.assertOrderExists(beforeOrder);
    this.ordersAuthorizationService.assertOrderRestaurantScope(
      beforeOrder,
      restaurantId,
    );

    const result = await this.moveOrderUseCase.execute(
      orderId,
      newTableId,
      restaurantId,
      onTargetOccupied,
    );

    if (!result.ok) {
      this.throwFromFailure(result);
    }

    await this.emitDomainAudit({
      action: AuditAction.ORDER_MOVED_TO_TABLE,
      restaurantId,
      payload: { orderId: result.value.id },
      changes: sanitizeAuditChanges({
        before: { tableId: beforeOrder.tableId || null },
        after: { tableId: result.value.tableId || null },
      }),
      actor,
      request,
      context: 'OrdersCommandService.moveOrder',
    });

    return OrderMapper.toDto(result.value);
  }

  async updateItems(
    id: string,
    items: Array<{ menu_item_id: string; quantity: number }>,
    restaurantId: string,
    notes?: string,
    type?: OrderType,
    customer_id?: string,
    address?: string,
    transaction_id?: string,
    actor?: User,
    request?: Request,
  ): Promise<OrderResponseDto> {
    const beforeOrder = await this.ordersRepository.findOneWithRelations(id);
    this.ordersAuthorizationService.assertOrderExists(beforeOrder);
    this.ordersAuthorizationService.assertOrderRestaurantScope(
      beforeOrder,
      restaurantId,
    );

    const result = await this.updateOrderItemsUseCase.execute({
      orderId: id,
      restaurantId,
      items,
      notes,
      type,
      customer_id,
      address,
    });

    if (!result.ok) {
      this.throwFromFailure(result);
    }

    const finalOrder = await this.ordersRepository.findOneWithRelations(
      result.value.orderId,
    );
    if (!finalOrder) {
      throw new NotFoundException(OrderErrorCodes.ORDER_NOT_FOUND);
    }

    this.notificationsGateway.notifyOrderStatus(
      restaurantId,
      finalOrder,
      transaction_id,
      result.value.previousStatus !== result.value.nextStatus
        ? {
            oldStatus: result.value.previousStatus,
            newStatus: result.value.nextStatus,
          }
        : undefined,
    );
    this.safeEmitDashboardChanged(restaurantId);
    await this.calculateAndNotifyKitchenLoad(restaurantId).catch((error) => {
      this.logger.error(
        JSON.stringify({
          step: 'update_items.kitchen_load_notify_failed',
          restaurantId,
          message: (error as Error)?.message,
        }),
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
        before: {
          status: result.value.previousStatus,
        },
        after: {
          status: finalOrder.status,
          totalAmount: Number(finalOrder.totalAmount),
          itemCount: finalOrder.items?.length || 0,
        },
      }),
      actor,
      request,
      context: 'OrdersCommandService.updateItems',
    });

    return OrderMapper.toDto(finalOrder);
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

  private async calculateAndNotifyKitchenLoad(
    restaurantId: string,
  ): Promise<void> {
    const [preparingCount, readyCount] = await Promise.all([
      this.ordersRepository.raw.count({
        where: {
          restaurantId,
          status: OrderStatus.PREPARING,
        },
      }),
      this.ordersRepository.raw.count({
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
