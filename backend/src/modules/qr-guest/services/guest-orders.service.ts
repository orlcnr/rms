import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  GuestOrder,
  GuestOrderStatus,
  GuestOrderEvent,
  GuestOrderEventType,
} from '../entities';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { GuestSession } from '../interfaces';
import {
  CreateDraftOrderDto,
  UpdateDraftOrderDto,
  SubmitOrderDto,
  ApproveGuestOrderDto,
  RejectGuestOrderDto,
} from '../dto';
import { MenuItem } from '../../menus/entities/menu-item.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';

@Injectable()
export class GuestOrdersService {
  constructor(
    @InjectRepository(GuestOrder)
    private guestOrderRepository: Repository<GuestOrder>,
    @InjectRepository(GuestOrderEvent)
    private guestOrderEventRepository: Repository<GuestOrderEvent>,
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) { }

  /**
   * Create a new draft order
   */
  async createDraftOrder(
    session: GuestSession,
    dto: CreateDraftOrderDto,
  ): Promise<GuestOrder> {
    // Check for idempotency if clientRequestId provided
    if (dto.clientRequestId) {
      const existingOrder = await this.guestOrderRepository.findOne({
        where: { clientRequestId: dto.clientRequestId },
      });
      if (existingOrder) {
        return existingOrder;
      }
    }

    // Validate menu items and calculate totals
    const { items, totalAmount } = await this.validateAndCalculateItems(
      dto.items,
      session.restaurantId,
    );

    // Create draft order
    const order = this.guestOrderRepository.create({
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      sessionId: session.id,
      status: GuestOrderStatus.DRAFT,
      items,
      notes: dto.notes || null,
      totalAmount,
      clientRequestId: dto.clientRequestId || null,
    });

    const savedOrder = await this.guestOrderRepository.save(order);

    // Create audit event
    await this.createOrderEvent(savedOrder.id, GuestOrderEventType.CREATED, {
      items: dto.items,
      totalAmount,
    });

    return savedOrder;
  }

  /**
   * Update a draft order
   */
  async updateDraftOrder(
    orderId: string,
    session: GuestSession,
    dto: UpdateDraftOrderDto,
  ): Promise<GuestOrder> {
    const order = await this.guestOrderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify ownership
    if (order.sessionId !== session.id) {
      throw new ForbiddenException(
        'You do not have permission to update this order',
      );
    }

    // Only allow updates to DRAFT orders
    if (order.status !== GuestOrderStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot update order with status: ${order.status}`,
      );
    }

    // Update items if provided
    if (dto.items) {
      const { items, totalAmount } = await this.validateAndCalculateItems(
        dto.items,
        session.restaurantId,
      );
      order.items = items;
      order.totalAmount = totalAmount;
    }

    // Update notes if provided
    if (dto.notes !== undefined) {
      order.notes = dto.notes || null;
    }

    const savedOrder = await this.guestOrderRepository.save(order);

    // Create audit event
    await this.createOrderEvent(order.id, GuestOrderEventType.UPDATED, {
      items: dto.items,
      notes: dto.notes,
    });

    return savedOrder;
  }

  /**
   * Submit a draft order for approval
   */
  async submitOrder(
    orderId: string,
    session: GuestSession,
    dto: SubmitOrderDto,
  ): Promise<GuestOrder> {
    const order = await this.guestOrderRepository.findOne({
      where: { id: orderId },
      relations: ['table'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify ownership
    if (order.sessionId !== session.id) {
      throw new ForbiddenException(
        'You do not have permission to submit this order',
      );
    }

    // Only allow submission of DRAFT orders
    if (order.status !== GuestOrderStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot submit order with status: ${order.status}`,
      );
    }

    // Check for idempotency
    if (dto.clientRequestId && order.clientRequestId !== dto.clientRequestId) {
      // Check if another order exists with this clientRequestId
      const existingOrder = await this.guestOrderRepository.findOne({
        where: { clientRequestId: dto.clientRequestId },
      });
      if (existingOrder) {
        return existingOrder;
      }
    }

    // Update order status
    order.status = GuestOrderStatus.SUBMITTED;
    order.submittedAt = new Date();
    if (dto.clientRequestId) {
      order.clientRequestId = dto.clientRequestId;
    }

    const savedOrder = await this.guestOrderRepository.save(order);

    // Create audit event
    await this.createOrderEvent(order.id, GuestOrderEventType.SUBMITTED, {
      submittedAt: order.submittedAt,
    });

    // Send notification to staff
    await this.notificationsService.create({
      restaurantId: session.restaurantId,
      title: 'Yeni Misafir Siparişi',
      message: `${order.table?.name || 'Bilinmeyen Masa'} için yeni bir sipariş gönderildi.`,
      type: NotificationType.GUEST_ORDER,
      data: {
        orderId: order.id,
        tableId: order.tableId,
        tableName: order.table?.name,
      },
    });

    return savedOrder;
  }

  /**
   * Get a guest order by ID
   */
  async getOrder(orderId: string, session: GuestSession): Promise<GuestOrder> {
    const order = await this.guestOrderRepository.findOne({
      where: { id: orderId },
      relations: ['restaurant', 'table'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify ownership
    if (order.sessionId !== session.id) {
      throw new ForbiddenException(
        'You do not have permission to view this order',
      );
    }

    return order;
  }

  /**
   * Get all orders for a session
   */
  async getSessionOrders(session: GuestSession): Promise<GuestOrder[]> {
    return this.guestOrderRepository.find({
      where: { sessionId: session.id },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get total bill for the table (includes other guests and staff orders)
   */
  async getTableBill(session: GuestSession) {
    const tableId = session.tableId;

    // 1. Get all active staff/real orders for this table
    const activeStaffOrders = await this.orderRepository.find({
      where: {
        tableId,
        status: In([
          OrderStatus.PENDING,
          OrderStatus.PREPARING,
          OrderStatus.READY,
          OrderStatus.SERVED,
        ]),
      },
      relations: ['items', 'items.menuItem'],
    });

    // 2. Get all pending guest orders for this table (not yet converted)
    const pendingGuestOrders = await this.guestOrderRepository.find({
      where: {
        tableId,
        status: In([GuestOrderStatus.SUBMITTED, GuestOrderStatus.APPROVED]),
      },
    });

    // Unify items for the guest view
    const items: { name: string; quantity: number; subtotal: number; status: string }[] = [];
    let totalAmount = 0;

    // Items from official orders (staff or converted guest orders)
    for (const order of activeStaffOrders) {
      for (const item of order.items) {
        items.push({
          name: item.menuItem?.name || 'Ürün',
          quantity: item.quantity,
          subtotal: Number(item.totalPrice),
          status: item.status,
        });
        totalAmount += Number(item.totalPrice);
      }
    }

    // Items from pending guest orders (not yet approved/converted)
    for (const go of pendingGuestOrders) {
      for (const item of go.items) {
        items.push({
          name: item.name,
          quantity: item.quantity,
          subtotal: Number(item.subtotal),
          status: go.status,
        });
        totalAmount += Number(item.subtotal);
      }
    }

    return {
      items,
      totalAmount,
    };
  }

  /**
   * Approve a guest order and convert to real order (staff only)
   */
  async approveOrder(
    orderId: string,
    dto: ApproveGuestOrderDto,
    staffUserId: string,
  ): Promise<{ guestOrder: GuestOrder; order: Order }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const guestOrder = await queryRunner.manager.findOne(GuestOrder, {
        where: { id: orderId },
      });

      if (!guestOrder) {
        throw new NotFoundException('Guest order not found');
      }

      if (guestOrder.status !== GuestOrderStatus.SUBMITTED) {
        throw new BadRequestException(
          `Cannot approve order with status: ${guestOrder.status}`,
        );
      }

      // Check if there's already an active order for this table
      let order = await queryRunner.manager.findOne(Order, {
        where: {
          restaurantId: guestOrder.restaurantId,
          tableId: guestOrder.tableId,
          status: In([
            OrderStatus.PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
          ]),
        },
        lock: { mode: 'pessimistic_write' },
      });

      let isNewOrder = false;
      if (!order) {
        // Create new order
        order = new Order();
        order.restaurantId = guestOrder.restaurantId;
        order.tableId = guestOrder.tableId;
        order.userId = null;
        order.status = OrderStatus.PENDING;
        order.totalAmount = 0;
        order.notes = guestOrder.notes;
        order.orderNumber = await this.generateOrderNumber(
          guestOrder.restaurantId,
        );
        order = await queryRunner.manager.save(order);
        isNewOrder = true;
      } else {
        // Append guest notes to existing order notes
        if (guestOrder.notes) {
          order.notes = order.notes
            ? `${order.notes}\n[Misafir]: ${guestOrder.notes}`
            : `[Misafir]: ${guestOrder.notes}`;
        }
        // Reset status to pending if it was already served/ready
        if (order.status === OrderStatus.SERVED || order.status === OrderStatus.READY) {
          order.status = OrderStatus.PENDING;
        }
      }

      // 1. Get existing items for merging
      const existingItems = await queryRunner.manager.find(OrderItem, {
        where: { orderId: order.id },
      });

      // 2. Create/Merge order items
      let totalAmount = 0; // We'll recalculate from all items to be safe

      // Keep track of processed item IDs to calculate total later
      const allOrderItems: OrderItem[] = [...existingItems];

      for (const guestItem of guestOrder.items) {
        // Try to find a PENDING item of the same menu item to merge
        const existingPendingItem = existingItems.find(
          (i) =>
            i.menuItemId === guestItem.menuItemId &&
            i.status === OrderStatus.PENDING,
        );

        if (existingPendingItem) {
          // Merge quantity
          existingPendingItem.quantity =
            Number(existingPendingItem.quantity) + Number(guestItem.quantity);
          existingPendingItem.totalPrice =
            Number(existingPendingItem.totalPrice) + Number(guestItem.subtotal);
          await queryRunner.manager.save(existingPendingItem);
        } else {
          // Create new item
          const newOrderItem = new OrderItem();
          newOrderItem.orderId = order.id;
          newOrderItem.menuItemId = guestItem.menuItemId;
          newOrderItem.quantity = guestItem.quantity;
          newOrderItem.unitPrice = guestItem.unitPrice;
          newOrderItem.totalPrice = guestItem.subtotal;
          newOrderItem.status = OrderStatus.PENDING;

          const savedItem = await queryRunner.manager.save(newOrderItem);
          allOrderItems.push(savedItem);
        }
      }

      // Recalculate total amount from all items
      totalAmount = allOrderItems.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0,
      );

      // Update order total and save
      order.totalAmount = totalAmount;
      const savedOrder = await queryRunner.manager.save(order);

      // Update guest order
      guestOrder.status = GuestOrderStatus.CONVERTED;
      guestOrder.convertedOrderId = savedOrder.id;
      guestOrder.approvedAt = new Date();

      const savedGuestOrder = await queryRunner.manager.save(guestOrder);

      // Create audit event
      await queryRunner.manager.save(GuestOrderEvent, {
        guestOrderId: guestOrder.id,
        type: GuestOrderEventType.CONVERTED,
        payload: { orderId: savedOrder.id, approvedBy: staffUserId },
        createdBy: staffUserId,
      });

      await queryRunner.commitTransaction();

      // Reload order with all relations for the frontend
      const fullOrder = await this.dataSource.getRepository(Order).findOne({
        where: { id: savedOrder.id },
        relations: ['items', 'items.menuItem', 'table'],
      });

      if (fullOrder) {
        // Emit real-time notification to staff
        if (isNewOrder) {
          this.notificationsGateway.notifyNewOrder(guestOrder.restaurantId, fullOrder);
        } else {
          this.notificationsGateway.notifyOrderStatus(guestOrder.restaurantId, fullOrder);
        }
      }

      // Also notify that this guest order is no longer pending
      this.notificationsGateway.server.to(guestOrder.restaurantId).emit('guest_order_processed', {
        id: guestOrder.id,
        status: GuestOrderStatus.CONVERTED,
        orderId: savedOrder.id
      });

      return { guestOrder: savedGuestOrder, order: savedOrder };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reject a guest order (staff only)
   */
  async rejectOrder(
    orderId: string,
    dto: RejectGuestOrderDto,
    staffUserId: string,
  ): Promise<GuestOrder> {
    const order = await this.guestOrderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Guest order not found');
    }

    if (order.status !== GuestOrderStatus.SUBMITTED) {
      throw new BadRequestException(
        `Cannot reject order with status: ${order.status}`,
      );
    }

    order.status = GuestOrderStatus.REJECTED;
    order.rejectedAt = new Date();
    order.rejectedReason = dto.reason;

    const savedOrder = await this.guestOrderRepository.save(order);

    // Create audit event
    await this.createOrderEvent(
      order.id,
      GuestOrderEventType.REJECTED,
      {
        reason: dto.reason,
        rejectedBy: staffUserId,
      },
      staffUserId,
    );

    // Also notify that this guest order is no longer pending
    this.notificationsGateway.server.to(order.restaurantId).emit('guest_order_processed', {
      id: order.id,
      status: GuestOrderStatus.REJECTED,
      reason: dto.reason,
    });

    return savedOrder;
  }

  /**
   * Get pending orders for a restaurant (staff view)
   */
  async getPendingOrdersForRestaurant(
    restaurantId: string,
    status?: GuestOrderStatus,
  ): Promise<GuestOrder[]> {
    const where: any = { restaurantId };
    if (status) {
      where.status = status;
    } else {
      where.status = GuestOrderStatus.SUBMITTED;
    }

    return this.guestOrderRepository.find({
      where,
      relations: ['table'],
      order: { submittedAt: 'DESC' },
    });
  }

  /**
   * Validate menu items and calculate totals
   */
  private async validateAndCalculateItems(
    items: { menuItemId: string; quantity: number; notes?: string }[],
    restaurantId: string,
  ): Promise<{
    items: {
      menuItemId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      notes?: string;
    }[];
    totalAmount: number;
  }> {
    const validatedItems: {
      menuItemId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      notes?: string;
    }[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const menuItem = await this.menuItemRepository.findOne({
        where: { id: item.menuItemId },
        relations: ['category'],
      });

      if (!menuItem) {
        throw new BadRequestException(
          `Menu item not found: ${item.menuItemId}`,
        );
      }

      // Verify menu item belongs to restaurant
      if (menuItem.category?.restaurant_id !== restaurantId) {
        throw new BadRequestException(
          `Menu item does not belong to this restaurant: ${item.menuItemId}`,
        );
      }

      if (!menuItem.is_available) {
        throw new BadRequestException(
          `Menu item is not available: ${menuItem.name}`,
        );
      }

      const subtotal = Number(menuItem.price) * item.quantity;
      totalAmount += subtotal;

      validatedItems.push({
        menuItemId: item.menuItemId,
        name: menuItem.name,
        quantity: item.quantity,
        unitPrice: Number(menuItem.price),
        subtotal,
        notes: item.notes,
      });
    }

    return { items: validatedItems, totalAmount };
  }

  /**
   * Create order event for audit
   */
  private async createOrderEvent(
    guestOrderId: string,
    type: GuestOrderEventType,
    payload: Record<string, any>,
    createdBy?: string,
  ): Promise<void> {
    const event = this.guestOrderEventRepository.create({
      guestOrderId,
      type,
      payload,
      createdBy: createdBy || null,
    });

    await this.guestOrderEventRepository.save(event);
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(restaurantId: string): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `ORD-${dateStr}-${random}`;
  }

  /**
   * Expire old draft orders (called by cron job)
   */
  async expireOldDraftOrders(hoursOld: number = 24): Promise<number> {
    const cutoffDate = new Date(Date.now() - hoursOld * 60 * 60 * 1000);

    const orders = await this.guestOrderRepository.find({
      where: {
        status: GuestOrderStatus.DRAFT,
        created_at: cutoffDate,
      },
    });

    for (const order of orders) {
      order.status = GuestOrderStatus.EXPIRED;
      await this.guestOrderRepository.save(order);

      await this.createOrderEvent(order.id, GuestOrderEventType.EXPIRED, {
        expiredAt: new Date(),
      });
    }

    return orders.length;
  }
}
