import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { OrderItem } from '../entities/order-item.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Injectable()
export class OrderItemRepository {
  constructor(
    @InjectRepository(OrderItem)
    private readonly repository: Repository<OrderItem>,
  ) {}

  async updateStatusesByIds(
    itemIds: string[],
    status: OrderStatus,
  ): Promise<void> {
    if (!itemIds.length) return;

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ status })
      .where('id IN (:...itemIds)', { itemIds })
      .execute();
  }

  async findForUpdateByOrderId(
    queryRunner: QueryRunner,
    orderId: string,
  ): Promise<OrderItem[]> {
    return queryRunner.manager
      .createQueryBuilder(OrderItem, 'orderItem')
      .setLock('pessimistic_write')
      .where('orderItem.order_id = :orderId', { orderId })
      .orderBy('orderItem.created_at', 'ASC')
      .getMany();
  }

  get raw(): Repository<OrderItem> {
    return this.repository;
  }
}
