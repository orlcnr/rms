import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repository: Repository<Order>,
  ) {}

  createBaseListQuery(restaurantId: string): SelectQueryBuilder<Order> {
    return this.repository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.menuItem', 'menuItem')
      .leftJoinAndSelect('order.table', 'table')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.restaurant_id = :restaurantId', { restaurantId });
  }

  async findOneWithRelations(id: string): Promise<Order | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
    });
  }

  async findByRestaurant(restaurantId: string): Promise<Order[]> {
    return this.repository.find({
      where: { restaurantId },
      relations: ['items', 'items.menuItem', 'table', 'user', 'customer'],
      order: { created_at: 'DESC' } as never,
    });
  }

  get raw(): Repository<Order> {
    return this.repository;
  }
}
