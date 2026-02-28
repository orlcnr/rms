import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  startOfDay,
  subDays,
  format,
  subHours,
  startOfHour,
  eachHourOfInterval,
  differenceInHours,
  isEqual,
} from 'date-fns';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Table, TableStatus } from '../tables/entities/table.entity';
import {
  AnalyticsSummaryDto,
  DailyRevenueDto,
  HourlySalesDto,
  PaymentDistributionDto,
  OrderTypeDistributionDto,
} from './dto/analytics-summary.dto';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Table)
    private readonly tablesRepository: Repository<Table>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  /**
   * Restaurant için analytics özetini getirir
   * @param restaurantId - Restaurant UUID
   * @returns Analytics özet verisi
   */
  async getSummary(restaurantId: string): Promise<AnalyticsSummaryDto> {
    if (!restaurantId) {
      this.logger.warn('getSummary called without restaurantId');
      return this.getEmptySummary();
    }

    try {
      const [
        occupancyRate,
        revenueData,
        activeOrdersData,
        paymentDistribution,
        orderTypeDistribution,
      ] = await Promise.all([
        this.calculateOccupancyRate(restaurantId),
        this.calculateRevenueMetrics(restaurantId),
        this.getActiveOrdersMetrics(restaurantId),
        this.calculatePaymentDistribution(restaurantId),
        this.calculateOrderTypeDistribution(restaurantId),
      ]);

      return {
        dailyRevenue: revenueData,
        activeOrdersCount: activeOrdersData.count,
        occupancyRate,
        averageOrderValue: activeOrdersData.totalAmount,
        paymentDistribution,
        orderTypeDistribution,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get analytics summary for restaurant ${restaurantId}`,
        error.stack,
      );
      return this.getEmptySummary();
    }
  }

  /**
   * Sipariş tipine göre dağılımı hesaplar (bugün için)
   * @param restaurantId - Restaurant UUID
   * @returns Sipariş tipi dağılım listesi
   */
  private async calculateOrderTypeDistribution(
    restaurantId: string,
  ): Promise<any[]> {
    try {
      const today = startOfDay(new Date());

      const results = await this.ordersRepository
        .createQueryBuilder('order')
        .select('order.type', 'type')
        .addSelect('SUM(order.totalAmount)', 'amount')
        .addSelect('COUNT(*)', 'count')
        .where('order.restaurantId = :restaurantId', { restaurantId })
        .andWhere('order.created_at >= :today', { today })
        .groupBy('order.type')
        .getRawMany();

      const totalAmount = results.reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0,
      );

      return results.map((r) => ({
        type: r.type,
        amount: Number(r.amount),
        count: Number(r.count),
        percentage:
          totalAmount > 0
            ? Math.round((Number(r.amount) / totalAmount) * 100)
            : 0,
      }));
    } catch (error) {
      this.logger.error(
        'Failed to calculate order type distribution',
        error.stack,
      );
      return [];
    }
  }

  /**
   * Masa doluluk oranını hesaplar (aktif siparişi olan masalar)
   * @param restaurantId - Restaurant UUID
   * @returns Doluluk oranı (0-100)
   */
  private async calculateOccupancyRate(restaurantId: string): Promise<number> {
    try {
      const result = await this.tablesRepository
        .createQueryBuilder('table')
        .leftJoin(
          'orders',
          'ord',
          'ord.table_id = table.id AND ord.status IN (:...activeStatuses)',
          {
            activeStatuses: [
              OrderStatus.PENDING,
              OrderStatus.PREPARING,
              OrderStatus.READY,
            ],
          },
        )
        .select('COUNT(DISTINCT table.id)', 'total')
        .addSelect('COUNT(DISTINCT ord.table_id)', 'occupied')
        .where('table.restaurant_id = :restaurantId', { restaurantId })
        .getRawOne();
      const total = Number(result?.total || 0);
      const occupied = Number(result?.occupied || 0);

      if (total === 0) {
        return 0;
      }

      const occupancyRate = Math.round((occupied / total) * 100);

      return occupancyRate;
    } catch (error) {
      this.logger.error('Failed to calculate occupancy rate', error.stack);
      return 0;
    }
  }

  /**
   * Günlük gelir metriklerini hesaplar (bugün, dün, trend)
   * @param restaurantId - Restaurant UUID
   * @returns Günlük gelir verileri
   */
  private async calculateRevenueMetrics(
    restaurantId: string,
  ): Promise<DailyRevenueDto> {
    try {
      const now = new Date();
      const today = startOfDay(now);
      const yesterday = subDays(today, 1);
      const revenues = await this.ordersRepository
        .createQueryBuilder('order')
        .select('DATE(order.created_at)', 'date')
        .addSelect('SUM(order.totalAmount)', 'revenue')
        .where('order.restaurantId = :restaurantId', { restaurantId })
        .andWhere('order.status = :status', { status: OrderStatus.PAID })
        .andWhere('order.created_at >= :yesterday', { yesterday })
        .groupBy('DATE(order.created_at)')
        .getRawMany();

      const todayRevenue = this.sumRevenueByDate(revenues, today);
      const yesterdayRevenue = this.sumRevenueByDate(revenues, yesterday);
      const trend = this.calculateTrend(todayRevenue, yesterdayRevenue);

      return {
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        trend,
      };
    } catch (error) {
      this.logger.error('Failed to calculate revenue metrics', error.stack);
      return {
        today: 0,
        yesterday: 0,
        trend: 0,
      };
    }
  }

  /**
   * Aktif sipariş metriklerini getirir
   * @param restaurantId - Restaurant UUID
   * @returns Aktif sipariş sayısı ve toplam tutar
   */
  private async getActiveOrdersMetrics(
    restaurantId: string,
  ): Promise<{ count: number; totalAmount: number }> {
    try {
      const result = await this.ordersRepository
        .createQueryBuilder('order')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalAmount')
        .where('order.restaurantId = :restaurantId', { restaurantId })
        .andWhere('order.status IN (:...statuses)', {
          statuses: [
            OrderStatus.PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
          ],
        })
        .getRawOne();

      const count = Number(result?.count || 0);
      const totalAmount = Number(result?.totalAmount || 0);
      return { count, totalAmount };
    } catch (error) {
      this.logger.error('Failed to get active orders metrics', error.stack);
      return { count: 0, totalAmount: 0 };
    }
  }

  /**
   * Ödeme yöntemlerine göre ciro dağılımını hesaplar (bugün için)
   * @param restaurantId - Restaurant UUID
   * @returns Ödeme dağılım listesi
   */
  private async calculatePaymentDistribution(
    restaurantId: string,
  ): Promise<PaymentDistributionDto[]> {
    try {
      const today = startOfDay(new Date());

      const results = await this.paymentsRepository
        .createQueryBuilder('payment')
        .innerJoin('payment.order', 'order')
        .select('payment.payment_method', 'method')
        .addSelect('SUM(payment.final_amount)', 'amount')
        .where('order.restaurantId = :restaurantId', { restaurantId })
        .andWhere('payment.created_at >= :today', { today })
        .groupBy('payment.payment_method')
        .getRawMany();

      const total = results.reduce(
        (sum, r) => sum + Number(r.amount || r.payment_amount || 0),
        0,
      );

      return results.map((r) => ({
        method: r.method,
        amount: Number(r.amount),
        percentage:
          total > 0 ? Math.round((Number(r.amount) / total) * 100) : 0,
      }));
    } catch (error) {
      this.logger.error(
        'Failed to calculate payment distribution',
        error.stack,
      );
      return [];
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Boş analytics özeti döner
   */
  private getEmptySummary(): AnalyticsSummaryDto {
    return {
      dailyRevenue: {
        today: 0,
        yesterday: 0,
        trend: 0,
      },
      activeOrdersCount: 0,
      occupancyRate: 0,
      averageOrderValue: 0,
      paymentDistribution: [],
      orderTypeDistribution: [],
    };
  }

  /**
   * Belirli bir tarihe ait geliri toplar
   * @param revenues - Database'den gelen gelir kayıtları
   * @param targetDate - Hedef tarih
   * @returns Toplam gelir
   */
  private sumRevenueByDate(
    revenues: Array<{ date: Date | string; revenue: string | number }>,
    targetDate: Date,
  ): number {
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');

    return revenues
      .filter((r) => {
        const revenueDate = new Date(r.date);
        return format(revenueDate, 'yyyy-MM-dd') === targetDateStr;
      })
      .reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  }

  /**
   * Gelir trendini hesaplar (yüzdelik değişim)
   * @param current - Güncel gelir
   * @param previous - Önceki gelir
   * @returns Yüzdelik değişim
   */
  private calculateTrend(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Son 24 saatin saatlik satış raporunu getirir
   * @param restaurantId - Restaurant UUID
   * @returns Saatlik satış verileri (son 24 saat)
   */
  async getHourlySales(restaurantId: string): Promise<HourlySalesDto[]> {
    if (!restaurantId) {
      this.logger.warn('getHourlySales called without restaurantId');
      return this.getEmptyHourlySales();
    }

    try {
      const now = new Date();
      const twentyFourHoursAgo = subHours(now, 24);

      // 1. En eski açık siparişi bul (PENDING, PREPARING, READY, SERVED)
      const oldestOpenOrder = await this.ordersRepository.findOne({
        where: {
          restaurantId,
          status: In([
            OrderStatus.PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
            OrderStatus.ON_WAY,
            OrderStatus.DELIVERED,
          ]),
        },
        order: { created_at: 'ASC' },
      });

      // Rapor başlangıç zamanı: En eski açık siparişin saati veya son 24 saat (hangisi daha eskiyse)
      let reportStartTime = twentyFourHoursAgo;
      if (oldestOpenOrder && oldestOpenOrder.created_at < reportStartTime) {
        reportStartTime = startOfHour(oldestOpenOrder.created_at);
      }

      // 2. Ödenmiş siparişler (PAID)
      const paidResults = await this.ordersRepository
        .createQueryBuilder('order')
        .select("DATE_TRUNC('hour', order.created_at)", 'time_bucket')
        .addSelect('SUM(order.totalAmount)', 'totalSales')
        .addSelect('COUNT(*)', 'orderCount')
        .where('order.restaurantId = :restaurantId', { restaurantId })
        .andWhere('order.status = :status', { status: OrderStatus.PAID })
        .andWhere('order.created_at >= :reportStartTime', { reportStartTime })
        .groupBy("DATE_TRUNC('hour', order.created_at)")
        .orderBy('time_bucket', 'ASC')
        .getRawMany();

      // 3. Ödenmemiş açık siparişler (Tüm zamanlar / Açık kaldığı sürece)
      const unpaidResults = await this.ordersRepository
        .createQueryBuilder('order')
        .select("DATE_TRUNC('hour', order.created_at)", 'time_bucket')
        .addSelect('SUM(order.totalAmount)', 'unpaidAmount')
        .addSelect('COUNT(*)', 'unpaidOrderCount')
        .where('order.restaurantId = :restaurantId', { restaurantId })
        .andWhere('order.status IN (:...statuses)', {
          statuses: [
            OrderStatus.PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
            OrderStatus.ON_WAY,
            OrderStatus.DELIVERED,
          ],
        })
        // Not: Burada reportStartTime kısıtlaması yapmıyoruz çünkü eski olanlar da dahil edilmeli
        // Ancak chart'ın çok uzamaması için makul bir sınır (örn 7 gün) konulabilir
        .groupBy("DATE_TRUNC('hour', order.created_at)")
        .orderBy('time_bucket', 'ASC')
        .getRawMany();

      // 4. Gerçek Tahsilatlar (PAYMENTS)
      const collectionResults = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select("DATE_TRUNC('hour', payment.created_at)", 'time_bucket')
        .addSelect('SUM(payment.final_amount)', 'collectedAmount')
        .innerJoin('payment.order', 'order')
        .where('order.restaurantId = :restaurantId', { restaurantId })
        .andWhere('payment.status = :status', {
          status: PaymentStatus.COMPLETED,
        })
        .andWhere('payment.created_at >= :reportStartTime', { reportStartTime })
        .groupBy("DATE_TRUNC('hour', payment.created_at)")
        .orderBy('time_bucket', 'ASC')
        .getRawMany();

      // Interval saatlerini oluştur
      const hoursInterval = eachHourOfInterval({
        start: reportStartTime,
        end: now,
      });

      // Map ile eşleştirme performansını artır ve TZ kaymalarını önle
      const hourlyMap = new Map<number, HourlySalesDto>();
      const hourlyData: HourlySalesDto[] = hoursInterval.map((date) => {
        const item: HourlySalesDto = {
          hour: date.getHours(),
          dateTime: date.toISOString(),
          totalSales: 0,
          orderCount: 0,
          unpaidAmount: 0,
          unpaidOrderCount: 0,
          collectedAmount: 0,
        };
        hourlyMap.set(startOfHour(date).getTime(), item);
        return item;
      });

      // Ödenmiş siparişleri işle
      paidResults.forEach((row) => {
        const rowTime = startOfHour(new Date(row.time_bucket)).getTime();
        const item = hourlyMap.get(rowTime);
        if (item) {
          item.totalSales = Number(row.totalSales) || 0;
          item.orderCount = Number(row.orderCount) || 0;
        }
      });

      // Ödenmemiş siparişleri işle
      unpaidResults.forEach((row) => {
        const rowTime = startOfHour(new Date(row.time_bucket)).getTime();
        const item = hourlyMap.get(rowTime);
        if (item) {
          item.unpaidAmount = Number(row.unpaidAmount) || 0;
          item.unpaidOrderCount = Number(row.unpaidOrderCount) || 0;
        }
      });

      // Tahsilatları işle
      collectionResults.forEach((row) => {
        const rowTime = startOfHour(new Date(row.time_bucket)).getTime();
        const item = hourlyMap.get(rowTime);
        if (item) {
          item.collectedAmount = Number(row.collectedAmount) || 0;
        } else {
          this.logger.warn(
            `No map entry for collection bucket: ${row.time_bucket} (${rowTime})`,
          );
        }
      });

      return hourlyData;
    } catch (error) {
      this.logger.error('Failed to get hourly sales', error.stack);
      return this.getEmptyHourlySales();
    }
  }

  /**
   * Boş saatlik satış verisi döner (24 saat)
   */
  private getEmptyHourlySales(): HourlySalesDto[] {
    const now = new Date();
    const hours = eachHourOfInterval({
      start: subHours(now, 23),
      end: now,
    });

    return hours.map((date) => ({
      hour: date.getHours(),
      dateTime: date.toISOString(),
      totalSales: 0,
      orderCount: 0,
      unpaidAmount: 0,
      unpaidOrderCount: 0,
      collectedAmount: 0,
    }));
  }
}
