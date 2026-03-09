import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InventoryService } from '../../inventory/inventory.service';
import { Order } from '../../orders/entities/order.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PaymentStockDeductionListener {
  private readonly logger = new Logger(PaymentStockDeductionListener.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly inventoryService: InventoryService,
  ) {}

  @OnEvent('payment.stock-deduction.requested')
  async handle(event: { orderId: string; restaurantId: string }): Promise<void> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: event.orderId, restaurantId: event.restaurantId },
        relations: ['items', 'items.menuItem'],
      });

      if (!order) {
        this.logger.warn(`Order not found for stock deduction: ${event.orderId}`);
        return;
      }

      await this.inventoryService.decreaseStockForOrder(order, undefined as never);
    } catch (error) {
      this.logger.warn(
        `Stock deduction request failed for order ${event.orderId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }
}
