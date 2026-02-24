import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from '../../orders/entities/order.entity';
import { Customer } from '../../customers/entities/customer.entity';

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  DIGITAL_WALLET = 'digital_wallet',
  BANK_TRANSFER = 'bank_transfer',
  OPEN_ACCOUNT = 'open_account', // Açık Hesap / Cari
}

export enum PaymentStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  PENDING = 'pending',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum DiscountType {
  DISCOUNT = 'discount', // İskonto - toplamdan düşülür, gelir azalır
  COMPLIMENTARY = 'complimentary', // İkram - ayrı raporlanır
}

@Entity('payments', { schema: 'operations' })
export class Payment extends BaseEntity {
  @Column()
  order_id: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  payment_method: PaymentMethod;

  // Nakit ödeme için
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cash_received: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  change_given: number | null;

  // İndirim/İkram
  @Column({ type: 'enum', enum: DiscountType, nullable: true })
  discount_type: DiscountType | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'text', nullable: true })
  discount_reason: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  final_amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.COMPLETED,
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  transaction_id: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  // Refund için orijinal ödeme
  @Column({ type: 'uuid', nullable: true })
  original_payment_id: string | null;
}
