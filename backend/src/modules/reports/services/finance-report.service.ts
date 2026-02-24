import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { differenceInDays } from 'date-fns';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { DateRangeDto } from '../dto/date-range.dto';

@Injectable()
export class FinanceReportService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
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

  async getPaymentMethodStats(
    restaurantId: string | null,
    query: DateRangeDto,
  ) {
    const { start_date, end_date } = query;
    const start = start_date
      ? new Date(start_date)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = end_date ? new Date(end_date) : new Date();
    if (end_date) {
      end.setHours(23, 59, 59, 999);
    }

    this.validateParams(restaurantId, start, end);

    const results = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.order', 'order')
      .select('payment.payment_method', 'method')
      .addSelect('COUNT(payment.id)', 'count')
      .addSelect('SUM(payment.final_amount)', 'total_amount')
      .where('order.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('payment.payment_method')
      .getRawMany();

    return results.map((row) => ({
      method: row.method,
      count: parseInt(row.count),
      total_amount: parseFloat(row.total_amount || 0),
    }));
  }

  async getDiscountStats(restaurantId: string | null, query: DateRangeDto) {
    const { start_date, end_date } = query;
    const start = start_date
      ? new Date(start_date)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = end_date ? new Date(end_date) : new Date();
    if (end_date) {
      end.setHours(23, 59, 59, 999);
    }

    this.validateParams(restaurantId, start, end);

    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.order', 'order')
      .select('SUM(payment.discount_amount)', 'total_discount')
      .addSelect(
        'COUNT(CASE WHEN payment.discount_amount > 0 THEN 1 END)',
        'discounted_orders_count',
      )
      .where('order.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.created_at BETWEEN :start AND :end', { start, end })
      .getRawOne();

    return {
      total_discount: parseFloat(result.total_discount || 0),
      discounted_orders_count: parseInt(result.discounted_orders_count || 0),
    };
  }
}
