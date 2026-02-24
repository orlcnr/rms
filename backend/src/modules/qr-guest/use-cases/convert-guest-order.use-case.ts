import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  GuestOrder,
  GuestOrderStatus,
  GuestOrderEvent,
  GuestOrderEventType,
} from '../entities';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { GuestGateway } from '../gateways/guest.gateway';

export interface ConvertGuestOrderResult {
  guestOrder: GuestOrder;
  order: Order;
}

@Injectable()
export class ConvertGuestOrderUseCase {
  constructor(
    @InjectRepository(GuestOrder)
    private guestOrderRepository: Repository<GuestOrder>,
    @InjectRepository(GuestOrderEvent)
    private guestOrderEventRepository: Repository<GuestOrderEvent>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private dataSource: DataSource,
    private guestGateway: GuestGateway,
  ) {}

  /**
   * Execute the conversion of a guest order to a real order
   */
  async execute(
    guestOrderId: string,
    staffUserId: string,
    notes?: string,
  ): Promise<ConvertGuestOrderResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate guest order
      const guestOrder = await queryRunner.manager.findOne(GuestOrder, {
        where: { id: guestOrderId },
        relations: ['table'],
      });

      if (!guestOrder) {
        throw new NotFoundException('Guest order not found');
      }

      if (guestOrder.status !== GuestOrderStatus.SUBMITTED) {
        throw new BadRequestException(
          `Cannot approve order with status: ${guestOrder.status}. Only SUBMITTED orders can be approved.`,
        );
      }

      // 2. Create real order
      const order = new Order();
      order.restaurantId = guestOrder.restaurantId;
      order.tableId = guestOrder.tableId;
      order.userId = null; // Guest order has no user
      order.status = OrderStatus.PENDING;
      order.totalAmount = Number(guestOrder.totalAmount);
      order.notes = notes || guestOrder.notes;
      order.orderNumber = await this.generateOrderNumber(
        guestOrder.restaurantId,
      );

      const savedOrder = await queryRunner.manager.save(order);

      // 3. Create order items
      for (const item of guestOrder.items) {
        const orderItem = new OrderItem();
        orderItem.orderId = savedOrder.id;
        orderItem.menuItemId = item.menuItemId;
        orderItem.quantity = item.quantity;
        orderItem.unitPrice = item.unitPrice;
        orderItem.totalPrice = item.subtotal;

        await queryRunner.manager.save(orderItem);
      }

      // 4. Update guest order status
      guestOrder.status = GuestOrderStatus.CONVERTED;
      guestOrder.convertedOrderId = savedOrder.id;
      guestOrder.approvedAt = new Date();

      const savedGuestOrder = await queryRunner.manager.save(guestOrder);

      // 5. Create audit event
      await queryRunner.manager.save(GuestOrderEvent, {
        guestOrderId: guestOrder.id,
        type: GuestOrderEventType.CONVERTED,
        payload: {
          orderId: savedOrder.id,
          approvedBy: staffUserId,
          convertedAt: new Date(),
        },
        createdBy: staffUserId,
      });

      await queryRunner.commitTransaction();

      // 6. Emit notifications (outside transaction)
      this.emitNotifications(savedGuestOrder, savedOrder);

      return { guestOrder: savedGuestOrder, order: savedOrder };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
   * Emit notifications to guest and staff
   */
  private emitNotifications(guestOrder: GuestOrder, order: Order): void {
    // Notify guest
    this.guestGateway.notifyOrderStatusChange(guestOrder.sessionId, {
      orderId: guestOrder.id,
      status: GuestOrderStatus.CONVERTED,
      timestamp: new Date(),
    });

    // Notify guest about approval
    this.guestGateway.notifyGuest(
      guestOrder.sessionId,
      'guest:order:approved',
      {
        guestOrderId: guestOrder.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        message: 'Your order has been approved and is being prepared!',
        timestamp: new Date(),
      },
    );

    // Notify staff
    this.guestGateway.notifyOrderConverted(guestOrder.restaurantId, {
      guestOrderId: guestOrder.id,
      orderId: order.id,
      tableId: guestOrder.tableId,
      timestamp: new Date(),
    });
  }
}
