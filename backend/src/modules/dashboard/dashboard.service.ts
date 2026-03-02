import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { In, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { Table } from '../tables/entities/table.entity';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { Payment } from '../payments/entities/payment.entity';
import { DashboardKpiDto } from './dto/dashboard-kpi.dto';
import { DailyOperationsDto } from './dto/daily-operations.dto';
import { RevenueTrendDto } from './dto/revenue-trend.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async getKpi(restaurantId: string): Promise<DashboardKpiDto> {
    const [
      salesMetrics,
      activeOrders,
      pendingOrders,
      tableStats,
      criticalStockCount,
    ] = await Promise.all([
      this.getDailySalesMetrics(restaurantId),
      this.orderRepository.count({
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
      }),
      this.orderRepository.count({
        where: {
          restaurantId,
          status: OrderStatus.PENDING,
        },
      }),
      this.getTableStats(restaurantId),
      this.getCriticalStockCount(restaurantId),
    ]);

    return {
      dailyNetSales: salesMetrics.today,
      dailySalesChange: salesMetrics.change,
      activeOrders,
      activeOrdersPending: pendingOrders,
      tableOccupancyRate: tableStats.rate,
      totalTables: tableStats.total,
      occupiedTables: tableStats.occupied,
      criticalStockCount,
    };
  }

  async getRevenueTrend(
    restaurantId: string,
    days = 7,
  ): Promise<RevenueTrendDto[]> {
    const safeDays = Math.max(1, Math.min(30, days));

    const rows = await this.orderRepository.manager.query(
      `
      WITH days AS (
        SELECT (NOW() AT TIME ZONE 'Europe/Istanbul')::date - offs AS day
        FROM generate_series(0, $2::int - 1) AS offs
      ),
      sales AS (
        SELECT
          (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul')::date AS day,
          COALESCE(SUM(o.total_amount), 0) AS amount
        FROM business.orders o
        WHERE o.restaurant_id = $1
          AND o.status::text = 'paid'
          AND (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul')::date >=
              ((NOW() AT TIME ZONE 'Europe/Istanbul')::date - ($2::int - 1))
        GROUP BY 1
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
             COALESCE(s.amount, 0)::float AS amount
      FROM days d
      LEFT JOIN sales s ON s.day = d.day
      ORDER BY d.day ASC
      `,
      [restaurantId, safeDays],
    );

    return rows.map((row) => ({
      date: row.date,
      amount: Number(row.amount || 0),
    }));
  }

  async getDailyOperations(
    restaurantId: string,
    date?: string,
    bucketMinutes = 30,
  ): Promise<DailyOperationsDto> {
    const safeBucket = bucketMinutes === 30 ? 30 : 30;
    const resolvedDate = date || this.getIstanbulDateString();
    const cacheKey = `dashboard:ops:${restaurantId}:${resolvedDate}:b${safeBucket}`;
    const cached = await this.cacheManager.get<DailyOperationsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.calculateDailyOperations(
      restaurantId,
      resolvedDate,
      safeBucket,
    );

    await this.cacheManager.set(cacheKey, result, 30_000);
    return result;
  }

  async invalidateDailyOpsCache(
    restaurantId: string,
    date?: string,
  ): Promise<void> {
    const targetDate = date || this.getIstanbulDateString();
    await this.cacheManager.del(
      `dashboard:ops:${restaurantId}:${targetDate}:b30`,
    );
  }

  private async getDailySalesMetrics(
    restaurantId: string,
  ): Promise<{ today: number; change: number }> {
    const rows = await this.paymentRepository.manager.query(
      `
      SELECT
        SUM(
          CASE
            WHEN (p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul')::date =
                 (NOW() AT TIME ZONE 'Europe/Istanbul')::date
            THEN COALESCE(p.final_amount, p.amount, 0) ELSE 0
          END
        )::float AS today_amount,
        SUM(
          CASE
            WHEN (p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul')::date =
                 ((NOW() AT TIME ZONE 'Europe/Istanbul')::date - INTERVAL '1 day')
            THEN COALESCE(p.final_amount, p.amount, 0) ELSE 0
          END
        )::float AS yesterday_amount
      FROM operations.payments p
      WHERE p.restaurant_id = $1
        AND p.status::text = 'completed'
        AND (p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul')::date >=
            ((NOW() AT TIME ZONE 'Europe/Istanbul')::date - INTERVAL '1 day')
      `,
      [restaurantId],
    );

    const today = Number(rows[0]?.today_amount || 0);
    const yesterday = Number(rows[0]?.yesterday_amount || 0);

    const change =
      yesterday > 0
        ? ((today - yesterday) / yesterday) * 100
        : today > 0
          ? 100
          : 0;

    return {
      today,
      change: Number(change.toFixed(2)),
    };
  }

  private async getTableStats(
    restaurantId: string,
  ): Promise<{ total: number; occupied: number; rate: number }> {
    const rows = await this.tableRepository.manager.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status::text = 'occupied')::int AS occupied
      FROM business.tables
      WHERE restaurant_id = $1
      `,
      [restaurantId],
    );

    const total = Number(rows[0]?.total || 0);
    const occupied = Number(rows[0]?.occupied || 0);

    const rate = total > 0 ? Number(((occupied / total) * 100).toFixed(2)) : 0;

    return { total, occupied, rate };
  }

  private async getCriticalStockCount(restaurantId: string): Promise<number> {
    const critical = await this.ingredientRepository
      .createQueryBuilder('ingredient')
      .leftJoin('ingredient.stock', 'stock')
      .where('ingredient.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('ingredient.critical_level > 0')
      .andWhere('COALESCE(stock.quantity, 0) > 0')
      .andWhere('COALESCE(stock.quantity, 0) <= ingredient.critical_level')
      .getCount();

    return critical;
  }

  private getIstanbulDateString(date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private toSparseBreakdown(
    input: Record<string, number>,
  ): Record<string, number> {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => Number(value) > 0),
    );
  }

  private async calculateDailyOperations(
    restaurantId: string,
    date: string,
    bucketMinutes: number,
  ): Promise<DailyOperationsDto> {
    const rows = await this.paymentRepository.manager.query(
      `
      WITH params AS (
        SELECT $2::date AS target_date
      ),
      buckets AS (
        SELECT
          gs AS idx,
          (p.target_date::timestamp + (gs * make_interval(mins => $3::int))) AS bucket_start,
          (p.target_date::timestamp + ((gs + 1) * make_interval(mins => $3::int))) AS bucket_end
        FROM params p
        CROSS JOIN generate_series(0, ((24 * 60) / $3::int) - 1) gs
      ),
      payments_daily AS (
        SELECT
          p.order_id,
          p.payment_method,
          COALESCE(p.final_amount, p.amount, 0)::numeric AS amount,
          (p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul') AS local_ts
        FROM operations.payments p
        CROSS JOIN params pa
        WHERE p.restaurant_id = $1
          AND p.status::text = 'completed'
          AND (p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul')::date = pa.target_date
      ),
      paid_orders_count AS (
        SELECT COUNT(DISTINCT order_id)::int AS closed_paid_orders_today
        FROM payments_daily
      ),
      tables_open_now AS (
        SELECT COUNT(*)::int AS current_open_tables
        FROM business.tables t
        WHERE t.restaurant_id = $1
          AND t.status::text = 'occupied'
      ),
      orders_open_now AS (
        SELECT COALESCE(SUM(o.total_amount), 0)::float AS open_orders_amount
        FROM business.orders o
        WHERE o.restaurant_id = $1
          AND o.status::text = ANY(
            ARRAY['pending', 'preparing', 'ready', 'served', 'on_way', 'delivered']::text[]
          )
      ),
      payment_totals AS (
        SELECT
          COALESCE(SUM(amount), 0)::float AS daily_sales_amount,
          COALESCE(SUM(CASE WHEN payment_method::text = 'cash' THEN amount ELSE 0 END), 0)::float AS total_cash,
          COALESCE(SUM(CASE WHEN payment_method::text = 'credit_card' THEN amount ELSE 0 END), 0)::float AS total_credit_card,
          COALESCE(SUM(CASE WHEN payment_method::text = 'debit_card' THEN amount ELSE 0 END), 0)::float AS total_debit_card,
          COALESCE(SUM(CASE WHEN payment_method::text = 'digital_wallet' THEN amount ELSE 0 END), 0)::float AS total_digital_wallet,
          COALESCE(SUM(CASE WHEN payment_method::text = 'bank_transfer' THEN amount ELSE 0 END), 0)::float AS total_bank_transfer,
          COALESCE(SUM(CASE WHEN payment_method::text = 'open_account' THEN amount ELSE 0 END), 0)::float AS total_open_account,
          COALESCE(SUM(CASE WHEN payment_method::text = 'meal_voucher' THEN amount ELSE 0 END), 0)::float AS total_meal_voucher
        FROM payments_daily
      ),
      bucket_agg AS (
        SELECT
          b.idx,
          to_char(b.bucket_start, 'HH24:MI') AS time,
          COUNT(DISTINCT pd.order_id)::int AS paid_orders,
          COALESCE(SUM(pd.amount), 0)::float AS sales_amount,
          COALESCE(SUM(CASE WHEN pd.payment_method::text = 'cash' THEN pd.amount ELSE 0 END), 0)::float AS bucket_cash,
          COALESCE(SUM(CASE WHEN pd.payment_method::text = 'credit_card' THEN pd.amount ELSE 0 END), 0)::float AS bucket_credit_card,
          COALESCE(SUM(CASE WHEN pd.payment_method::text = 'debit_card' THEN pd.amount ELSE 0 END), 0)::float AS bucket_debit_card,
          COALESCE(SUM(CASE WHEN pd.payment_method::text = 'digital_wallet' THEN pd.amount ELSE 0 END), 0)::float AS bucket_digital_wallet,
          COALESCE(SUM(CASE WHEN pd.payment_method::text = 'bank_transfer' THEN pd.amount ELSE 0 END), 0)::float AS bucket_bank_transfer,
          COALESCE(SUM(CASE WHEN pd.payment_method::text = 'open_account' THEN pd.amount ELSE 0 END), 0)::float AS bucket_open_account,
          COALESCE(SUM(CASE WHEN pd.payment_method::text = 'meal_voucher' THEN pd.amount ELSE 0 END), 0)::float AS bucket_meal_voucher
        FROM buckets b
        LEFT JOIN payments_daily pd
          ON pd.local_ts >= b.bucket_start
         AND pd.local_ts < b.bucket_end
        GROUP BY b.idx, b.bucket_start
      )
      SELECT
        ba.time,
        ba.paid_orders,
        ba.sales_amount,
        ba.bucket_cash,
        ba.bucket_credit_card,
        ba.bucket_debit_card,
        ba.bucket_digital_wallet,
        ba.bucket_bank_transfer,
        ba.bucket_open_account,
        ba.bucket_meal_voucher,
        pot.daily_sales_amount,
        pot.total_cash,
        pot.total_credit_card,
        pot.total_debit_card,
        pot.total_digital_wallet,
        pot.total_bank_transfer,
        pot.total_open_account,
        pot.total_meal_voucher,
        poc.closed_paid_orders_today,
        ton.current_open_tables,
        oon.open_orders_amount
      FROM bucket_agg ba
      CROSS JOIN payment_totals pot
      CROSS JOIN paid_orders_count poc
      CROSS JOIN tables_open_now ton
      CROSS JOIN orders_open_now oon
      ORDER BY ba.idx ASC
      `,
      [restaurantId, date, bucketMinutes],
    );

    const first = rows[0];
    const paymentTotals = this.toSparseBreakdown({
      cash: Number(first?.total_cash || 0),
      credit_card: Number(first?.total_credit_card || 0),
      debit_card: Number(first?.total_debit_card || 0),
      digital_wallet: Number(first?.total_digital_wallet || 0),
      bank_transfer: Number(first?.total_bank_transfer || 0),
      open_account: Number(first?.total_open_account || 0),
      meal_voucher: Number(first?.total_meal_voucher || 0),
    });

    return {
      date,
      currentOpenTables: Number(first?.current_open_tables || 0),
      closedPaidOrdersToday: Number(first?.closed_paid_orders_today || 0),
      dailySalesAmount: Number(first?.daily_sales_amount || 0),
      openOrdersAmount: Number(first?.open_orders_amount || 0),
      paymentTotals,
      series: rows.map((row) => ({
        time: row.time,
        paidOrders: Number(row.paid_orders || 0),
        salesAmount: Number(row.sales_amount || 0),
        paymentBreakdown: this.toSparseBreakdown({
          cash: Number(row.bucket_cash || 0),
          credit_card: Number(row.bucket_credit_card || 0),
          debit_card: Number(row.bucket_debit_card || 0),
          digital_wallet: Number(row.bucket_digital_wallet || 0),
          bank_transfer: Number(row.bucket_bank_transfer || 0),
          open_account: Number(row.bucket_open_account || 0),
          meal_voucher: Number(row.bucket_meal_voucher || 0),
        }),
      })),
    };
  }
}
