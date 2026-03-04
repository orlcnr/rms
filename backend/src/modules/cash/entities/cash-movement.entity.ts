import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CashMovementSubtype, CashMovementType } from '../enums/cash.enum';
import { PaymentMethod } from '../../payments/entities/payment.entity';
import { CashSession } from './cash-session.entity';

@Entity('cash_movements', { schema: 'operations' })
export class CashMovement extends BaseEntity {
  @Column({ name: 'cash_session_id' })
  cashSessionId: string;

  @ManyToOne(() => CashSession, (session) => session.movements)
  @JoinColumn({ name: 'cash_session_id' })
  session: CashSession;

  @Column({
    type: 'enum',
    enum: CashMovementType,
  })
  type: CashMovementType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  subtype: CashMovementSubtype | null;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string;

  @Column({ name: 'is_void', default: false })
  isVoid: boolean;

  @Column({ name: 'is_tip', default: false })
  isTip: boolean;

  @Column({ name: 'is_opening_balance', default: false })
  isOpeningBalance: boolean;

  @Column({ name: 'is_closing_difference', default: false })
  isClosingDifference: boolean;

  @Column({ name: 'is_manual_cash_in', default: false })
  isManualCashIn: boolean;

  @Column({ name: 'is_manual_cash_out', default: false })
  isManualCashOut: boolean;
}
