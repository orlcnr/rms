import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSplitPaymentDto } from './dto/create-split-payment.dto';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { Table, TableStatus } from '../tables/entities/table.entity';
import { CashMovementType } from '../cash/enums/cash.enum';
import { InventoryService } from '../inventory/inventory.service';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import { GetPaymentsDto } from './dto/get-payments.dto';
import { Customer } from '../customers/entities/customer.entity';
import { SettingsService } from '../settings/settings.service';
import { CashService } from '../cash/cash.service';

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { GuestSessionsService } from '../qr-guest/services/guest-sessions.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../audit/utils/sanitize-audit.util';

type AuditActor = {
  id?: string;
  first_name?: string;
  last_name?: string;
};

// Helper function for precise decimal calculations (to avoid floating point errors)
// Uses integer math: multiply by 100, calculate, then divide by 100
// Helper function to convert frontend discount type to database enum value
const mapDiscountTypeToDb = (
  discountType: string | undefined,
): string | null => {
  if (!discountType) return null;

  // Frontend sends fixed amount for both "discount" and "complimentary".
  // Keep semantic labels in DB; only explicit "percentage" should be treated
  // as percentage discount.
  const mapping: Record<string, string> = {
    discount: 'discount',
    DISCOUNT: 'discount',
    complimentary: 'complimentary',
    COMPLIMENTARY: 'complimentary',
    percentage: 'percentage',
    PERCENTAGE: 'percentage',
    fixed: 'fixed',
    FIXED: 'fixed',
  };

  return mapping[discountType] || discountType;
};

const calculateDiscount = (
  amount: number,
  discountValue: number,
  discountType: string | null | undefined,
): number => {
  const amountCents = Math.round(amount * 100);
  const discountCents = Math.round(discountValue * 100);

  if (discountCents <= 0) {
    return amountCents / 100;
  }

  // Map frontend values to database enum values for comparison
  const dbDiscountType = mapDiscountTypeToDb(discountType || undefined);

  if (dbDiscountType === 'percentage') {
    // Percentage discount (İskonto - yüzdelik indirim)
    const discountMultiplier = (10000 - discountCents) / 10000; // e.g., for 10% = 0.90
    const resultCents = Math.round(amountCents * discountMultiplier);
    return Math.max(0, resultCents / 100);
  }

  // Fixed amount discount (discount/complimentary/fixed)
  const resultCents = Math.max(0, amountCents - discountCents);
  return resultCents / 100;
};

/**
 * Calculates net tip amount after commission deduction.
 * Uses integer math to avoid floating point errors.
 *
 * @param tipAmount - The gross tip amount
 * @param commissionRate - The commission rate (e.g., 0.02 for 2%)
 * @returns The net tip amount after commission, or the original if no commission
 */
const calculateNetTip = (
  tipAmount: number,
  commissionRate: number,
): number | null => {
  if (!tipAmount || tipAmount <= 0) {
    return null;
  }
  if (!commissionRate || commissionRate <= 0) {
    return tipAmount;
  }
  // Integer math: calculate commission, then subtract
  const commissionCents = Math.round(tipAmount * 100 * commissionRate);
  const netCents = Math.round(tipAmount * 100) - commissionCents;
  return Math.max(0, netCents / 100);
};

const normalizeCommissionRate = (value?: number | string | null): number => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new BadRequestException('Komisyon oranı geçersiz');
  }

  // Support both formats:
  // - ratio: 0.03
  // - percent: 3
  if (numeric <= 1) {
    return numeric;
  }
  if (numeric <= 100) {
    return numeric / 100;
  }

  throw new BadRequestException('Komisyon oranı 0 ile 100 arasında olmalıdır');
};

@Injectable()
export class PaymentsService {
  private client: ClientProxy;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly settingsService: SettingsService,
    private readonly cashService: CashService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly guestSessionsService: GuestSessionsService,
    private readonly auditService: AuditService,
  ) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [
          this.configService.get<string>('RABBITMQ_URL') ||
            'amqp://localhost:5672',
        ],
        queue:
          this.configService.get<string>('RABBITMQ_POPULARITY_QUEUE') ||
          'popularity_update_queue',
        queueOptions: {
          durable: true,
        },
      },
    } as any);
  }

  private buildActorName(actor?: AuditActor): string | undefined {
    if (!actor?.first_name) {
      return undefined;
    }
    return `${actor.first_name} ${actor.last_name || ''}`.trim();
  }

  private async emitDomainAudit(params: {
    action: AuditAction;
    restaurantId?: string;
    payload?: Record<string, unknown>;
    changes?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      meta?: Record<string, unknown>;
    };
    actor?: AuditActor;
    request?: Request;
    context: string;
  }): Promise<void> {
    const headerUserAgent = params.request?.headers?.['user-agent'];
    const userAgent =
      typeof headerUserAgent === 'string'
        ? headerUserAgent
        : headerUserAgent?.[0];

    await this.auditService.safeEmitLog(
      {
        action: params.action,
        resource: 'PAYMENTS',
        user_id: params.actor?.id,
        user_name: this.buildActorName(params.actor),
        restaurant_id: params.restaurantId,
        payload: params.payload,
        changes: params.changes,
        ip_address: params.request?.ip,
        user_agent: userAgent,
      },
      params.context,
    );
    this.auditService.markRequestAsAudited(
      params.request as unknown as Record<string, unknown>,
    );
  }

  private async getEnabledPaymentMethods(
    restaurantId: string,
  ): Promise<Set<PaymentMethod>> {
    const fallback = Object.values(PaymentMethod);
    const settingValue = await this.settingsService.getSetting(
      restaurantId,
      'enabled_payment_methods',
      fallback,
    );

    const rawMethods = Array.isArray(settingValue) ? settingValue : fallback;
    const enabled = rawMethods.filter((method): method is PaymentMethod =>
      Object.values(PaymentMethod).includes(method as PaymentMethod),
    );

    return new Set(enabled.length > 0 ? enabled : fallback);
  }

  private validateMethodIsEnabled(
    method: PaymentMethod,
    enabledMethods: Set<PaymentMethod>,
  ): void {
    if (!enabledMethods.has(method)) {
      throw new BadRequestException(
        `Ödeme yöntemi aktif değil: ${method}. Lütfen Ayarlar > Ödeme bölümünden yöntemi aktif edin.`,
      );
    }
  }

  private getNextServiceCycleVersion(
    current: string | number | null | undefined,
  ): string {
    const normalized =
      current === undefined || current === null ? '1' : String(current);
    return (BigInt(normalized) + BigInt(1)).toString();
  }

  async findAll(queryDto: GetPaymentsDto): Promise<Pagination<Payment>> {
    const { page = 1, limit = 10, search } = queryDto;

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .leftJoinAndSelect('order.table', 'table');

    if (search) {
      queryBuilder.where(
        '(CAST(order.orderNumber AS TEXT) ILIKE :search OR payment.transaction_id ILIKE :search OR table.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('payment.created_at', 'DESC');

    return paginate<Payment>(queryBuilder, { page, limit });
  }

  async create(
    createPaymentDto: CreatePaymentDto,
    userId?: string,
    actor?: AuditActor,
    request?: Request,
  ): Promise<Payment> {
    const {
      order_id,
      amount,
      payment_method,
      transaction_id,
      discount_amount = 0,
      discount_type,
      description,
      tip_amount,
      commission_rate,
    } = createPaymentDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let updatedTableAfterPayment: {
      id: string;
      oldStatus: TableStatus;
      nextVersion: string;
    } | null = null;

    try {
      // 1. Fetch Order with Table and Items
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: order_id },
        relations: ['table', 'items', 'items.menuItem'],
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${order_id} not found`);
      }

      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException('Order is already paid');
      }
      const beforeSnapshot = {
        orderStatus: order.status,
      };

      const enabledMethods = await this.getEnabledPaymentMethods(
        order.restaurantId,
      );
      this.validateMethodIsEnabled(payment_method, enabledMethods);

      // Calculate Final Amount using precise decimal calculation
      const final_amount = calculateDiscount(
        Number(amount),
        Number(discount_amount),
        discount_type,
      );

      // 2. Resolve commission rate if not provided
      let resolvedCommissionRate = commission_rate;
      if (
        tip_amount &&
        tip_amount > 0 &&
        resolvedCommissionRate === undefined
      ) {
        resolvedCommissionRate = await this.settingsService.getSetting(
          order.restaurantId,
          'tip_commission_rate',
          0.02, // Fallback if settings are not initialized
        );
      }
      const normalizedCommissionRate = normalizeCommissionRate(
        resolvedCommissionRate,
      );

      // 3. Create Payment
      const payment = this.paymentRepository.create({
        order_id,
        restaurant_id: order.restaurantId,
        amount,
        discount_amount: Number(discount_amount) || 0,
        discount_type: mapDiscountTypeToDb(discount_type) || null,
        final_amount,
        payment_method,
        transaction_id,
        description,
        tip_amount: tip_amount ? Number(tip_amount) : null,
        commission_rate: tip_amount ? normalizedCommissionRate : null,
        net_tip_amount: tip_amount
          ? calculateNetTip(Number(tip_amount), normalizedCommissionRate)
          : null,
      });
      const savedPayment = await queryRunner.manager.save(payment);

      // 3. Update Order Status
      order.status = OrderStatus.PAID;
      await queryRunner.manager.save(order);

      // 4. Decrease stock (non-blocking for payment completion)
      try {
        await this.inventoryService.decreaseStockForOrder(order, queryRunner);
      } catch (stockError) {
        this.logger.warn(
          `Stock deduction failed after payment commit path for order ${order.id}: ${
            stockError instanceof Error ? stockError.message : 'unknown'
          }`,
        );
      }

      // 4.5. Check if there's an active cash session BEFORE committing
      // Use centralized register retrieval as source of truth
      const activeRegister = await this.cashService.getActiveRegister(
        order.restaurantId,
      );
      const activeSessions = await this.cashService.getAllActiveSessions(
        order.restaurantId,
      );
      const activeSession = activeSessions.find(
        (s) => s.register.id === activeRegister.id,
      )?.session;

      if (!activeSession) {
        throw new BadRequestException(
          'Ödeme yapılamaz: Bu restoranda aktif kasanın açık bir oturumu bulunmuyor. ' +
            'Lütfen önce kasayı açın veya yöneticinize başvurun.',
        );
      }

      await this.cashService.addMovement(
        (userId || order.userId)!, // Ensure userId is always a string
        activeSession.id,
        {
          cash_register_id: activeRegister.id,
          amount: Number(savedPayment.amount),
          type: CashMovementType.SALE,
          paymentMethod: savedPayment.payment_method,
          description: `Payment for order ${order.id}`,
          is_payment: true,
        },
        queryRunner,
      );

      // 4.7. Record Tip as cash movement if exists
      if (savedPayment.tip_amount && Number(savedPayment.tip_amount) > 0) {
        await this.cashService.addMovement(
          (userId || order.userId)!,
          activeSession.id,
          {
            cash_register_id: activeRegister.id,
            amount: Number(savedPayment.tip_amount),
            type: CashMovementType.IN,
            paymentMethod: savedPayment.payment_method,
            description: `Tip for order ${order.id}`,
            isTip: true,
          },
          queryRunner,
        );
      }

      // 5. Update Table Status if exists
      if (order.table) {
        const table = await queryRunner.manager.findOneBy(Table, {
          id: order.table.id,
        });
        if (table) {
          const oldStatus = table.status;
          const nextVersion = this.getNextServiceCycleVersion(
            table.serviceCycleVersion,
          );
          table.serviceCycleVersion = nextVersion;
          table.status = TableStatus.AVAILABLE;
          await queryRunner.manager.save(table);
          updatedTableAfterPayment = {
            id: table.id,
            oldStatus,
            nextVersion,
          };
        }
      }

      await queryRunner.commitTransaction();

      if (updatedTableAfterPayment) {
        await this.guestSessionsService.setServiceCycleVersionCache(
          updatedTableAfterPayment.id,
          updatedTableAfterPayment.nextVersion,
        );
        await this.guestSessionsService.markRecentPaymentClose(
          updatedTableAfterPayment.id,
        );
      }

      // Emit payment completed event first so cash and guests get the notification
      this.eventEmitter.emit('payment.completed', {
        tableId: order.table?.id,
        restaurantId: order.restaurantId,
        orderId: order.id,
        amount: savedPayment.final_amount,
        paymentMethod: savedPayment.payment_method,
        userId: userId || order.userId,
        tipAmount: savedPayment.tip_amount,
      });

      // 4.5. Emit popularity update via RabbitMQ
      const popularityData = {
        restaurantId: order.restaurantId,
        items: order.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
      };
      this.client.emit('popularity.update', popularityData);

      if (updatedTableAfterPayment) {
        this.eventEmitter.emit('table.status.changed', {
          tableId: updatedTableAfterPayment.id,
          restaurantId: order.restaurantId,
          oldStatus: updatedTableAfterPayment.oldStatus,
          newStatus: TableStatus.AVAILABLE,
        });
      }

      await this.emitDomainAudit({
        action: AuditAction.PAYMENT_CREATED,
        restaurantId: order.restaurantId,
        payload: {
          orderId: order.id,
          paymentId: savedPayment.id,
          transactionId: transaction_id,
        },
        changes: sanitizeAuditChanges({
          before: beforeSnapshot,
          after: {
            orderStatus: OrderStatus.PAID,
            finalAmount: Number(savedPayment.final_amount),
            paymentMethod: savedPayment.payment_method,
          },
        }),
        actor: actor || { id: userId },
        request,
        context: 'PaymentsService.create',
      });

      return savedPayment;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllByOrder(orderId: string): Promise<Payment[]> {
    return this.paymentRepository.find({ where: { order_id: orderId } });
  }

  /**
   * PARÇALI ÖDEME (SPLIT PAYMENT) - Ana Metot
   *
   * Bu metod:
   * 1. Database transaction başlatır
   * 2. Ödemeleri kaydeder
   * 3. OPEN_ACCOUNT ise müşteri borcunu günceller
   * 4. Kredi limiti kontrolü yapar
   * 5. Başarılı olursa socket event'leri emit eder
   */
  async createSplitPayment(
    dto: CreateSplitPaymentDto,
    userId?: string,
    actor?: AuditActor,
    request?: Request,
  ): Promise<{ payments: Payment[]; change: number }> {
    const {
      order_id,
      payments,
      discount_type,
      discount_reason,
      discount_amount,
    } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let updatedSplitPaymentTable: {
      id: string;
      oldStatus: TableStatus;
      nextVersion: string;
    } | null = null;

    try {
      // 1. Siparişi getir
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: order_id },
        relations: ['table', 'items', 'items.menuItem'],
      });

      if (!order) {
        throw new NotFoundException(`Sipariş bulunamadı: ${order_id}`);
      }

      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException('Bu sipariş zaten ödenmiş');
      }
      const beforeSnapshot = {
        orderStatus: order.status,
      };

      const enabledMethods = await this.getEnabledPaymentMethods(
        order.restaurantId,
      );
      for (const payment of payments) {
        if (Number(payment.amount) <= 0) {
          throw new BadRequestException(
            'Ödeme tutarı sıfırdan büyük olmalıdır',
          );
        }

        this.validateMethodIsEnabled(payment.payment_method, enabledMethods);

        if (
          payment.payment_method === PaymentMethod.MEAL_VOUCHER &&
          !payment.meal_voucher_type
        ) {
          throw new BadRequestException(
            'Yemek çeki ödemesi için çek tipi seçilmelidir',
          );
        }
      }

      // 2. Toplam ödenen miktarı hesapla
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const orderTotal = Number(order.totalAmount);

      // İndirimi uygula
      const discountVal = Number(discount_amount || 0);

      // Calculate final total using the helper function for precise decimal calculation
      const finalOrderTotal = calculateDiscount(
        orderTotal,
        discountVal,
        discount_type,
      );

      // Kuruş hatalarını önlemek için 100 ile çarp (kuruş bazlı hesaplama)
      const totalPaidCents = Math.round(totalPaid * 100);
      const finalTotalCents = Math.round(finalOrderTotal * 100);

      if (totalPaidCents < finalTotalCents) {
        const remaining = (finalTotalCents - totalPaidCents) / 100;
        throw new BadRequestException(
          `Ödenen tutar yetersiz. Kalan: ${remaining.toFixed(2)} TL`,
        );
      }

      // 3. Açık hesap ödemelerinde müşteri ve kredi limiti kontrolü
      const openAccountPayments = payments.filter(
        (p) => p.payment_method === PaymentMethod.OPEN_ACCOUNT,
      );

      for (const payment of openAccountPayments) {
        if (!payment.customer_id) {
          throw new BadRequestException(
            'Açık hesap ödemesi için müşteri seçilmelidir',
          );
        }

        const customer = await queryRunner.manager.findOne(Customer, {
          where: { id: payment.customer_id },
        });

        if (!customer) {
          throw new NotFoundException(
            `Müşteri bulunamadı: ${payment.customer_id}`,
          );
        }

        // Kredi limiti kontrolü
        if (customer.credit_limit_enabled && customer.credit_limit > 0) {
          const newDebt = Number(payment.amount);
          const projectedDebt = Number(customer.current_debt) + newDebt;

          if (projectedDebt > customer.credit_limit) {
            throw new BadRequestException(
              `Kredi limiti aşılacak. Mevcut borç: ${customer.current_debt} TL, Kredi limiti: ${customer.credit_limit} TL, Yeni eklenecek: ${newDebt} TL`,
            );
          }
        }

        // Açık sipariş sayısı kontrolü
        const openOrdersCount = await queryRunner.manager.count(Payment, {
          where: {
            customer_id: payment.customer_id,
            status: PaymentStatus.COMPLETED,
          },
          relations: ['order'],
        });

        if (
          customer.max_open_orders > 0 &&
          openOrdersCount >= customer.max_open_orders
        ) {
          throw new BadRequestException(
            `Müşterinin maksimum açık sipariş limiti dolmuş (${customer.max_open_orders})`,
          );
        }
      }

      // 4. Aktif kasa oturumunu bul (tüm ödeme yöntemleri için zorunlu)
      // Use centralized register retrieval as source of truth
      const activeRegister = await this.cashService.getActiveRegister(
        order.restaurantId,
      );
      const activeSessions = await this.cashService.getAllActiveSessions(
        order.restaurantId,
      );
      const typedActiveSession = activeSessions.find(
        (s) => s.register.id === activeRegister.id,
      )?.session;

      if (!typedActiveSession) {
        throw new BadRequestException(
          'Ödeme yapılamaz: Bu restoranda aktif kasanın açık bir oturumu bulunmuyor. Lütfen önce kasayı açın.',
        );
      }

      // 5. Ödemeleri kaydet
      const savedPayments: Payment[] = [];
      let totalChange = 0;

      for (const payment of payments) {
        const cashReceived = payment.cash_received
          ? Number(payment.cash_received)
          : 0;
        const amount = Number(payment.amount);
        const change = cashReceived > amount ? cashReceived - amount : 0;

        totalChange += change;

        // Calculate final_amount for this payment (amount after discount)
        const final_amount = calculateDiscount(
          amount,
          discountVal,
          discount_type,
        );

        // Bahşiş ve Komisyon Hesaplama
        const tipAmount = payment.tip_amount ? Number(payment.tip_amount) : 0;
        let resolvedCommissionRate = payment.commission_rate;

        // 6. Kasa hareketini kaydet (tüm ödeme yöntemleri için satış kırılımı gerekir)
        await this.cashService.addMovement(
          (userId || order.userId)!, // Ensure userId is always a string
          typedActiveSession.id,
          {
            cash_register_id: activeRegister.id,
            amount: amount,
            type: CashMovementType.SALE,
            paymentMethod: payment.payment_method,
            description: `Split payment for order ${order.id} via ${payment.payment_method}`,
            is_payment: true,
          },
          queryRunner,
        );

        // 6.1. Bahşişi kaydet (eğer varsa)
        if (tipAmount > 0) {
          await this.cashService.addMovement(
            (userId || order.userId)!,
            typedActiveSession.id,
            {
              cash_register_id: activeRegister.id,
              amount: tipAmount,
              type: CashMovementType.IN,
              paymentMethod: payment.payment_method,
              description: `Tip for order ${order.id} via ${payment.payment_method}`,
              isTip: true,
            },
            queryRunner,
          );
        }

        if (tipAmount > 0 && resolvedCommissionRate === undefined) {
          resolvedCommissionRate = await this.settingsService.getSetting(
            order.restaurantId,
            'tip_commission_rate',
            0.02,
          );
        }
        const normalizedCommissionRate = normalizeCommissionRate(
          resolvedCommissionRate,
        );

        const netTipAmount =
          tipAmount > 0
            ? calculateNetTip(tipAmount, normalizedCommissionRate)
            : null;

        const newPayment = this.paymentRepository.create({
          order_id: order.id,
          restaurant_id: order.restaurantId, // Multi-tenant: link to restaurant
          amount: amount,
          discount_amount: discountVal,
          discount_type: mapDiscountTypeToDb(discount_type) || 'fixed',
          discount_reason,
          final_amount,
          payment_method: payment.payment_method,
          meal_voucher_type:
            payment.payment_method === PaymentMethod.MEAL_VOUCHER
              ? payment.meal_voucher_type
              : null,
          customer_id: payment.customer_id,
          transaction_id: payment.transaction_id,
          description: payment.description,
          cash_received: cashReceived,
          change_given: change,
          tip_amount: tipAmount > 0 ? tipAmount : null,
          commission_rate: tipAmount > 0 ? normalizedCommissionRate : null,
          net_tip_amount: netTipAmount,
          status: PaymentStatus.COMPLETED,
        });

        const saved = await queryRunner.manager.save(newPayment);
        savedPayments.push(saved);

        // 5.1. Açık hesap ödemesinde müşteri borcunu güncelle
        if (
          payment.payment_method === PaymentMethod.OPEN_ACCOUNT &&
          payment.customer_id
        ) {
          await queryRunner.manager.increment(
            Customer,
            { id: payment.customer_id },
            'current_debt',
            amount,
          );
        }
      }

      // 5.2. Kasa hareketleri zaten yukarıdaki döngüde kaydedildi (atomik)

      // 6. Sipariş durumunu güncelle
      order.status = OrderStatus.PAID;
      await queryRunner.manager.save(order);

      // 7. Stok düş
      try {
        await this.inventoryService.decreaseStockForOrder(order, queryRunner);
      } catch (stockError) {
        this.logger.warn(
          `Stock deduction failed for split payment order ${order.id}: ${
            stockError instanceof Error ? stockError.message : 'unknown'
          }`,
        );
      }

      if (order.table) {
        const table = await queryRunner.manager.findOneBy(Table, {
          id: order.table.id,
        });

        if (table) {
          const nextVersion = this.getNextServiceCycleVersion(
            table.serviceCycleVersion,
          );
          table.serviceCycleVersion = nextVersion;
          const oldStatus = table.status;
          table.status = TableStatus.AVAILABLE;
          await queryRunner.manager.save(table);
          updatedSplitPaymentTable = {
            id: table.id,
            oldStatus,
            nextVersion,
          };
        }
      }

      // 8. Transaction'ı commit et
      await queryRunner.commitTransaction();

      if (updatedSplitPaymentTable) {
        await this.guestSessionsService.setServiceCycleVersionCache(
          updatedSplitPaymentTable.id,
          updatedSplitPaymentTable.nextVersion,
        );
        await this.guestSessionsService.markRecentPaymentClose(
          updatedSplitPaymentTable.id,
        );
      }

      // 9. Socket event'leri emit et (transaction dışında — cash kaydı artık transaction içinde yapılıyor)
      this.eventEmitter.emit('payment.completed', {
        tableId: order.table?.id,
        restaurantId: order.restaurantId,
        orderId: order.id,
        amount: finalOrderTotal,
        paymentMethod: 'SPLIT',
        userId: userId || order.userId,
      });

      // 10. Popülerlik güncellemesi
      const popularityData = {
        restaurantId: order.restaurantId,
        items: order.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
      };
      this.client.emit('popularity.update', popularityData);

      // 11. Masa durumunu güncelle (socket)
      if (updatedSplitPaymentTable) {
        this.eventEmitter.emit('table.status.changed', {
          tableId: updatedSplitPaymentTable.id,
          restaurantId: order.restaurantId,
          oldStatus: updatedSplitPaymentTable.oldStatus,
          newStatus: TableStatus.AVAILABLE,
        });
      }

      // 12. Müşteri borç güncelleme event'i
      for (const payment of openAccountPayments) {
        this.eventEmitter.emit('customer.debt.updated', {
          customerId: payment.customer_id,
          restaurantId: order.restaurantId,
          newDebt: Number(payment.amount),
        });
      }

      await this.emitDomainAudit({
        action: AuditAction.PAYMENT_SPLIT_CREATED,
        restaurantId: order.restaurantId,
        payload: {
          orderId: order.id,
          paymentIds: savedPayments.map((payment) => payment.id),
        },
        changes: {
          ...sanitizeAuditChanges({
            before: beforeSnapshot,
            after: { orderStatus: OrderStatus.PAID },
          }),
          // Split payment lines are variable in count/composition; summary meta is the canonical audit representation.
          meta: {
            operation: 'split_payment',
            itemCount: payments.length,
            affectedCount: savedPayments.length,
            failedIds: [],
            context: {
              orderId: order.id,
              totalPaid,
              finalOrderTotal,
              openAccountLineCount: openAccountPayments.length,
            },
          },
        },
        actor: actor || { id: userId },
        request,
        context: 'PaymentsService.createSplitPayment',
      });

      return { payments: savedPayments, change: totalChange };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * ÖDEME İADESİ (REVERT/REFUND)
   *
   * Bu metod:
   * 1. Ödemeyi bulur ve iptal eder
   * 2. OPEN_ACCOUNT ise müşteri borcunu azaltır
   * 3. Nakit ise kasa hareketi oluşturur
   * 4. Sipariş durumunu günceller
   */
  async revertPayment(
    paymentId: string,
    reason: string,
    actor?: AuditActor,
    request?: Request,
  ): Promise<Payment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { id: paymentId },
        relations: ['order', 'order.table'],
      });

      if (!payment) {
        throw new NotFoundException(`Ödeme bulunamadı: ${paymentId}`);
      }

      if (
        payment.status === PaymentStatus.REFUNDED ||
        payment.status === PaymentStatus.CANCELLED
      ) {
        throw new BadRequestException('Bu ödeme zaten iade edilmiş');
      }
      const beforeSnapshot = {
        paymentStatus: payment.status,
        orderStatus: payment.order?.status,
      };

      // Ödemeyi iptal et
      payment.status = PaymentStatus.REFUNDED;
      if (payment.description) {
        payment.description = `${payment.description} | İADE: ${reason}`;
      } else {
        payment.description = `İADE: ${reason}`;
      }
      const refundedPayment = await queryRunner.manager.save(payment);

      // Açık hesap ödemesi ise müşteri borcunu azalt
      if (
        payment.payment_method === PaymentMethod.OPEN_ACCOUNT &&
        payment.customer_id
      ) {
        await queryRunner.manager.decrement(
          Customer,
          { id: payment.customer_id },
          'current_debt',
          Number(payment.amount),
        );

        this.eventEmitter.emit('customer.debt.updated', {
          customerId: payment.customer_id,
          restaurantId: payment.order?.restaurantId,
          newDebt: -Number(payment.amount),
        });
      }

      // Sipariş durumunu güncelle (eğer başka ödeme yoksa)
      const remainingPayments = await queryRunner.manager.count(Payment, {
        where: {
          order_id: payment.order_id,
          status: PaymentStatus.COMPLETED,
        },
      });

      if (remainingPayments === 0 && payment.order) {
        payment.order.status = OrderStatus.PENDING; // or appropriate status
        await queryRunner.manager.save(payment.order);
      }

      await queryRunner.commitTransaction();

      // Socket event
      this.eventEmitter.emit('payment.reverted', {
        paymentId: payment.id,
        orderId: payment.order_id,
        restaurantId: payment.order?.restaurantId,
        reason,
      });

      await this.emitDomainAudit({
        action: AuditAction.PAYMENT_REVERTED,
        restaurantId: payment.order?.restaurantId,
        payload: {
          paymentId: payment.id,
          orderId: payment.order_id,
          reason,
        },
        changes: sanitizeAuditChanges({
          before: beforeSnapshot,
          after: {
            paymentStatus: refundedPayment.status,
            orderStatus: payment.order?.status,
          },
        }),
        actor,
        request,
        context: 'PaymentsService.revertPayment',
      });

      return refundedPayment;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
