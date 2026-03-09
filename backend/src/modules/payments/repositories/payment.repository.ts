import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly repository: Repository<Payment>,
  ) {}

  createBaseQuery(): SelectQueryBuilder<Payment> {
    return this.repository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .leftJoinAndSelect('order.table', 'table');
  }

  findByOrderAndRestaurant(
    orderId: string,
    restaurantId: string,
  ): Promise<Payment[]> {
    return this.repository.find({
      where: { order_id: orderId, restaurant_id: restaurantId },
      order: { created_at: 'DESC' } as never,
    });
  }

  async getOrderAggregates(
    orderId: string,
    managerRepository?: Repository<Payment>,
  ): Promise<{ totalCompleted: number; totalRefunded: number; netPaid: number }> {
    const repo = managerRepository ?? this.repository;
    const raw = await repo
      .createQueryBuilder('payment')
      .select(
        `SUM(CASE WHEN payment.status = :completed THEN payment.final_amount ELSE 0 END)`,
        'totalCompleted',
      )
      .addSelect(
        `SUM(CASE WHEN payment.status = :refunded THEN payment.final_amount ELSE 0 END)`,
        'totalRefunded',
      )
      .where('payment.order_id = :orderId', { orderId })
      .setParameters({
        completed: PaymentStatus.COMPLETED,
        refunded: PaymentStatus.REFUNDED,
      })
      .getRawOne<{ totalCompleted: string | null; totalRefunded: string | null }>();

    const totalCompleted = Number(raw?.totalCompleted ?? 0);
    const totalRefunded = Number(raw?.totalRefunded ?? 0);
    return { totalCompleted, totalRefunded, netPaid: totalCompleted - totalRefunded };
  }

  create(entity: Partial<Payment>): Payment {
    return this.repository.create(entity);
  }

  save(entity: Payment): Promise<Payment> {
    return this.repository.save(entity);
  }

  get raw(): Repository<Payment> {
    return this.repository;
  }
}
