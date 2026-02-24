import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { differenceInDays } from 'date-fns';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { DateRangeDto } from '../dto/date-range.dto';

@Injectable()
export class SalesReportService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  private validateParams(restaurantId: string | null, start: Date, end: Date) {
    if (!restaurantId) {
      throw new UnauthorizedException(
        'Bir restorana atanmış olmanız gerekmektedir.',
      );
    }

    const days = Math.abs(differenceInDays(end, start));
    if (days > 31) {
      throw new BadRequestException('Rapor süresi maksimum 31 gün olabilir.');
    }
  }

  private async buildQuery(
    baseQuery: any,
    restaurantId: string,
    start: Date,
    end: Date,
  ) {
    return baseQuery
      .andWhere('order.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.created_at BETWEEN :start AND :end', { start, end });
  }

  async getDailySales(restaurantId: string | null, query: DateRangeDto) {
    const { start_date, end_date } = query;
    const start = start_date
      ? new Date(start_date)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = end_date ? new Date(end_date) : new Date();
    if (end_date) {
      end.setHours(23, 59, 59, 999);
    }

    this.validateParams(restaurantId, start, end);

    let qb = this.orderRepository
      .createQueryBuilder('order')
      .select("DATE_TRUNC('day', order.created_at)", 'date')
      .addSelect('COUNT(order.id)', 'order_count')
      .addSelect('SUM(order.total_amount)', 'total_revenue')
      .addSelect('AVG(order.total_amount)', 'average_order_value')
      .where('1=1');

    qb = await this.buildQuery(qb, restaurantId as string, start, end);

    const results = await qb
      .groupBy("DATE_TRUNC('day', order.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    return results.map((row) => ({
      date: row.date instanceof Date ? row.date.toISOString() : row.date,
      order_count: parseInt(row.order_count),
      total_revenue: parseFloat(row.total_revenue || 0),
      average_order_value: parseFloat(row.average_order_value || 0),
    }));
  }

  async getSalesByProduct(restaurantId: string | null, query: DateRangeDto) {
    const { start_date, end_date } = query;
    const start = start_date
      ? new Date(start_date)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = end_date ? new Date(end_date) : new Date();
    if (end_date) {
      end.setHours(23, 59, 59, 999);
    }

    this.validateParams(restaurantId, start, end);

    const results = await this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoin('item.order', 'order')
      .leftJoin('item.menuItem', 'menuItem')
      .select('menuItem.id', 'product_id')
      .addSelect('menuItem.name', 'product_name')
      .addSelect('SUM(item.quantity)', 'total_quantity')
      .addSelect('SUM(item.subtotal)', 'total_revenue')
      .where('order.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('menuItem.id')
      .addGroupBy('menuItem.name')
      .orderBy('total_revenue', 'DESC')
      .limit(10)
      .getRawMany();

    return results.map((row) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      total_quantity: parseInt(row.total_quantity),
      total_revenue: parseFloat(row.total_revenue || 0),
    }));
  }

  async getSalesByCategory(restaurantId: string | null, query: DateRangeDto) {
    const { start_date, end_date } = query;
    const start = start_date
      ? new Date(start_date)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = end_date ? new Date(end_date) : new Date();
    if (end_date) {
      end.setHours(23, 59, 59, 999);
    }

    this.validateParams(restaurantId, start, end);

    const results = await this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoin('item.order', 'order')
      .leftJoin('item.menuItem', 'menuItem')
      .leftJoin('menuItem.category', 'category')
      .select('category.id', 'category_id')
      .addSelect('category.name', 'category_name')
      .addSelect('SUM(item.quantity)', 'total_quantity')
      .addSelect('SUM(item.subtotal)', 'total_revenue')
      .where('order.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('total_revenue', 'DESC')
      .getRawMany();

    return results.map((row) => ({
      category_id: row.category_id,
      category_name: row.category_name,
      total_quantity: parseInt(row.total_quantity),
      total_revenue: parseFloat(row.total_revenue || 0),
    }));
  }

  async getHourlySales(restaurantId: string | null, query: { date?: string }) {
    const targetDate = query.date ? new Date(query.date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    if (!restaurantId) {
      throw new UnauthorizedException(
        'Bir restorana atanmış olmanız gerekmektedir.',
      );
    }

    const results = await this.orderRepository
      .createQueryBuilder('order')
      .select('EXTRACT(HOUR FROM order.created_at)', 'hour')
      .addSelect('COUNT(order.id)', 'order_count')
      .addSelect('SUM(order.total_amount)', 'total_revenue')
      .where('order.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.created_at BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .groupBy('EXTRACT(HOUR FROM order.created_at)')
      .orderBy('hour', 'ASC')
      .getRawMany();

    return results.map((row) => ({
      hour: parseInt(row.hour),
      order_count: parseInt(row.order_count),
      total_revenue: parseFloat(row.total_revenue || 0),
    }));
  }
}
