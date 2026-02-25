import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus, DiscountType } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSplitPaymentDto } from './dto/create-split-payment.dto';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { Table, TableStatus } from '../tables/entities/table.entity';
import { CashSession } from '../cash/entities/cash-session.entity';
import { InventoryService } from '../inventory/inventory.service';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import { GetPaymentsDto } from './dto/get-payments.dto';
import { Customer } from '../customers/entities/customer.entity';

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

// Helper function for precise decimal calculations (to avoid floating point errors)
// Uses integer math: multiply by 100, calculate, then divide by 100
const calculateDiscount = (
  amount: number,
  discountValue: number,
  discountType: DiscountType | null | undefined
): number => {
  const amountCents = Math.round(amount * 100);
  const discountCents = Math.round(discountValue * 100);

  if (discountCents <= 0) {
    return amountCents / 100;
  }

  if (discountType === DiscountType.DISCOUNT) {
    // Percentage discount (İskonto - yüzdelik indirim)
    const discountMultiplier = (10000 - discountCents) / 10000; // e.g., for 10% = 0.90
    const resultCents = Math.round(amountCents * discountMultiplier);
    return Math.max(0, resultCents / 100);
  } else {
    // Fixed discount (İkram - sabit indirim)
    const resultCents = Math.max(0, amountCents - discountCents);
    return resultCents / 100;
  }
};

/**
 * Calculates net tip amount after commission deduction.
 * Uses integer math to avoid floating point errors.
 * 
 * @param tipAmount - The gross tip amount
 * @param commissionRate - The commission rate percentage (e.g., 10 for 10%)
 * @returns The net tip amount after commission, or the original if no commission
 */
const calculateNetTip = (tipAmount: number, commissionRate: number): number | null => {
  if (!tipAmount || tipAmount <= 0) {
    return null;
  }
  if (commissionRate <= 0) {
    return tipAmount;
  }
  // Integer math: multiply by 100, calculate, divide by 100
  return Math.round(tipAmount * (1 - commissionRate / 100) * 100) / 100;
};

@Injectable()
export class PaymentsService {
  private client: ClientProxy;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
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

  async create(createPaymentDto: CreatePaymentDto, userId?: string): Promise<Payment> {
    const {
      order_id,
      amount,
      payment_method,
      transaction_id,
      discount_amount = 0,
      discount_type = DiscountType.DISCOUNT,
      description,
      tip_amount,
      commission_rate,
    } = createPaymentDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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

      // Calculate Final Amount using precise decimal calculation
      const final_amount = calculateDiscount(
        Number(amount),
        Number(discount_amount),
        discount_type
      );

      // 2. Create Payment
      const payment = this.paymentRepository.create({
        order_id,
        restaurant_id: order.restaurantId, // Multi-tenant: link to restaurant
        amount,
        discount_amount: Number(discount_amount) || 0,
        discount_type,
        final_amount,
        payment_method,
        transaction_id,
        description,
        tip_amount: tip_amount ? Number(tip_amount) : null,
        commission_rate: commission_rate ? Number(commission_rate) : null,
        net_tip_amount: calculateNetTip(Number(tip_amount), Number(commission_rate)),
      });
      const savedPayment = await queryRunner.manager.save(payment);

      // 3. Update Order Status
      order.status = OrderStatus.PAID;
      await queryRunner.manager.save(order);

      // 4. Decrease stock
      await this.inventoryService.decreaseStockForOrder(order, queryRunner);

      // 4.5. Check if there's an active cash session BEFORE committing
      const cashSessionRepo = queryRunner.manager.getRepository(CashSession);
      const activeSession = await cashSessionRepo
        .createQueryBuilder('session')
        .innerJoin('session.cashRegister', 'register')
        .where('register.restaurant_id = :restaurantId', { restaurantId: order.restaurantId })
        .andWhere('session.status = :status', { status: 'open' })
        .getOne();

      if (!activeSession) {
        throw new BadRequestException(
          'Ödeme yapılamaz: Bu restoranda açık bir kasa oturumu bulunmuyor. ' +
          'Lütfen önce bir kasa açın veya yöneticinize başvurun.'
        );
      }

      await queryRunner.commitTransaction();

      // Emit payment completed event first so cash and guests get the notification
      this.eventEmitter.emit('payment.completed', {
        tableId: order.table?.id,
        restaurantId: order.restaurantId,
        orderId: order.id,
        amount: savedPayment.final_amount,
        paymentMethod: savedPayment.payment_method,
        userId: userId || order.userId,
      });

      // 4.5. Emit popularity update via RabbitMQ
      const popularityData = {
        restaurantId: order.restaurantId,
        items: order.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
      };
      this.client.emit('popularity.update', popularityData);

      // 5. Update Table Status if exists
      if (order.table) {
        const table = await queryRunner.manager.findOneBy(Table, {
          id: order.table.id,
        });
        if (table) {
          const oldStatus = table.status;
          table.status = TableStatus.AVAILABLE;
          await queryRunner.manager.save(table);

          this.eventEmitter.emit('table.status.changed', {
            tableId: table.id,
            restaurantId: order.restaurantId,
            oldStatus: oldStatus,
            newStatus: TableStatus.AVAILABLE,
          });
        }
      }

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
    userId?: string
  ): Promise<{ payments: Payment[]; change: number }> {
    const { order_id, payments, discount_type, discount_reason, discount_amount } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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

      // 2. Toplam ödenen miktarı hesapla
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const orderTotal = Number(order.totalAmount);
      
      // İndirimi uygula
      const discountVal = Number(discount_amount || 0);

      // Calculate final total using the helper function for precise decimal calculation
      const finalOrderTotal = calculateDiscount(
        orderTotal,
        discountVal,
        discount_type
      );
      
      // Kuruş hatalarını önlemek için 100 ile çarp (kuruş bazlı hesaplama)
      const totalPaidCents = Math.round(totalPaid * 100);
      const finalTotalCents = Math.round(finalOrderTotal * 100);
      
      if (totalPaidCents < finalTotalCents) {
        const remaining = (finalTotalCents - totalPaidCents) / 100;
        throw new BadRequestException(
          `Ödenen tutar yetersiz. Kalan: ${remaining.toFixed(2)} TL`
        );
      }

      // 3. Açık hesap ödemelerinde müşteri ve kredi limiti kontrolü
      const openAccountPayments = payments.filter(
        p => p.payment_method === PaymentMethod.OPEN_ACCOUNT
      );

      for (const payment of openAccountPayments) {
        if (!payment.customer_id) {
          throw new BadRequestException(
            'Açık hesap ödemesi için müşteri seçilmelidir'
          );
        }

        const customer = await queryRunner.manager.findOne(Customer, {
          where: { id: payment.customer_id },
        });

        if (!customer) {
          throw new NotFoundException(`Müşteri bulunamadı: ${payment.customer_id}`);
        }

        // Kredi limiti kontrolü
        if (customer.credit_limit_enabled && customer.credit_limit > 0) {
          const newDebt = Number(payment.amount);
          const projectedDebt = Number(customer.current_debt) + newDebt;
          
          if (projectedDebt > customer.credit_limit) {
            throw new BadRequestException(
              `Kredi limiti aşılacak. Mevcut borç: ${customer.current_debt} TL, Kredi limiti: ${customer.credit_limit} TL, Yeni eklenecek: ${newDebt} TL`
            );
          }
        }

        // Açık sipariş sayısı kontrolü
        const openOrdersCount = await queryRunner.manager.count(Payment, {
          where: { 
            customer_id: payment.customer_id,
            status: PaymentStatus.COMPLETED 
          },
          relations: ['order']
        });
        
        if (customer.max_open_orders > 0 && openOrdersCount >= customer.max_open_orders) {
          throw new BadRequestException(
            `Müşterinin maksimum açık sipariş limiti dolmuş (${customer.max_open_orders})`
          );
        }
      }

      // 4. Kasa oturumu kontrolü (nakit ödeme varsa)
      const hasCashPayment = payments.some(
        p => p.payment_method === PaymentMethod.CASH
      );

      let activeSession: CashSession | null = null;
      
      if (hasCashPayment) {
        const cashSessionRepo = queryRunner.manager.getRepository(CashSession);
        activeSession = await cashSessionRepo
          .createQueryBuilder('session')
          .innerJoin('session.cashRegister', 'register')
          .where('register.restaurant_id = :restaurantId', { restaurantId: order.restaurantId })
          .andWhere('session.status = :status', { status: 'open' })
          .getOne();

        if (!activeSession) {
          throw new BadRequestException(
            'Ödeme yapılamaz: Bu restoranda açık bir kasa oturumu bulunmuyor.'
          );
        }
      }

      // 5. Ödemeleri kaydet
      const savedPayments: Payment[] = [];
      let totalChange = 0;

      for (const payment of payments) {
        const cashReceived = payment.cash_received ? Number(payment.cash_received) : 0;
        const amount = Number(payment.amount);
        const change = cashReceived > amount ? cashReceived - amount : 0;
        
        totalChange += change;

        // Calculate final_amount for this payment (amount after discount)
        const final_amount = calculateDiscount(
          amount,
          discountVal,
          discount_type
        );

        // Bahşiş ve Komisyon Hesaplama
        const tipAmount = payment.tip_amount ? Number(payment.tip_amount) : 0;
        const commissionRate = payment.commission_rate ? Number(payment.commission_rate) : 0;
        const netTipAmount = calculateNetTip(tipAmount, commissionRate);

        const newPayment = this.paymentRepository.create({
          order_id: order.id,
          restaurant_id: order.restaurantId, // Multi-tenant: link to restaurant
          amount: amount,
          discount_amount: discountVal,
          discount_type: discount_type,
          discount_reason,
          final_amount,
          payment_method: payment.payment_method,
          customer_id: payment.customer_id,
          cash_received: cashReceived,
          change_given: change,
          tip_amount: tipAmount > 0 ? tipAmount : null,
          commission_rate: commissionRate > 0 ? commissionRate : null,
          net_tip_amount: netTipAmount !== null ? netTipAmount : null,
          status: PaymentStatus.COMPLETED,
        });

        const saved = await queryRunner.manager.save(newPayment) as Payment;
        savedPayments.push(saved);

        // 5.1. Açık hesap ödemesinde müşteri borcunu güncelle
        if (payment.payment_method === PaymentMethod.OPEN_ACCOUNT && payment.customer_id) {
          await queryRunner.manager.increment(
            Customer,
            { id: payment.customer_id },
            'current_debt',
            amount
          );
          await queryRunner.manager.increment(
            Customer,
            { id: payment.customer_id },
            'total_debt',
            amount
          );
        }

        // 5.2. Nakit ödemesinde kasa hareketi (varsa)
        // Not: CashSessionService'de ayrıca işlenebilir
      }

      // 6. Sipariş durumunu güncelle
      order.status = OrderStatus.PAID;
      await queryRunner.manager.save(order);

      // 7. Stok düş
      await this.inventoryService.decreaseStockForOrder(order, queryRunner);

      // 8. Transaction'ı commit et
      await queryRunner.commitTransaction();

      // 9. Socket event'leri emit et (transaction dışında)
      this.eventEmitter.emit('payment.completed', {
        tableId: order.table?.id,
        restaurantId: order.restaurantId,
        orderId: order.id,
        amount: finalOrderTotal,
        paymentMethod: 'SPLIT', // Multiple payment methods used
        userId: userId || order.userId,
        payments: savedPayments.map(p => ({
          method: p.payment_method,
          amount: p.amount,
        })),
      });

      // 10. Popülerlik güncellemesi
      const popularityData = {
        restaurantId: order.restaurantId,
        items: order.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
      };
      this.client.emit('popularity.update', popularityData);

      // 11. Masa durumunu güncelle (socket)
      if (order.table) {
        this.eventEmitter.emit('table.status.changed', {
          tableId: order.table.id,
          restaurantId: order.restaurantId,
          oldStatus: order.table.status,
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
    userId?: string
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

      if (payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.CANCELLED) {
        throw new BadRequestException('Bu ödeme zaten iade edilmiş');
      }

      // Ödemeyi iptal et
      payment.status = PaymentStatus.REFUNDED;
      if (payment.description) {
        payment.description = `${payment.description} | İADE: ${reason}`;
      } else {
        payment.description = `İADE: ${reason}`;
      }
      const refundedPayment = await queryRunner.manager.save(payment);

      // Açık hesap ödemesi ise müşteri borcunu azalt
      if (payment.payment_method === PaymentMethod.OPEN_ACCOUNT && payment.customer_id) {
        await queryRunner.manager.decrement(
          Customer,
          { id: payment.customer_id },
          'current_debt',
          Number(payment.amount)
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

      return refundedPayment;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
