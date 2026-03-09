import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Payment } from '../entities/payment.entity';

@Injectable()
export class PaymentsAuthorizationService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  assertRestaurantAccess(actorRestaurantId: string | undefined, restaurantId: string): void {
    if (!actorRestaurantId || actorRestaurantId !== restaurantId) {
      throw new ForbiddenException('Payments scope forbidden');
    }
  }

  async assertOrderInScope(orderId: string, actorRestaurantId: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      select: ['id', 'restaurantId'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.restaurantId !== actorRestaurantId) {
      throw new ForbiddenException('Payments scope forbidden');
    }
  }

  async assertPaymentInScope(
    paymentId: string,
    actorRestaurantId: string,
  ): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      select: ['id', 'restaurant_id'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.restaurant_id !== actorRestaurantId) {
      throw new ForbiddenException('Payments scope forbidden');
    }
  }
}
