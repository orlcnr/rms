import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CashSessionStatus } from '../enums/cash.enum';

@Entity('cash_sessions', { schema: 'operations' })
export class CashSession extends BaseEntity {
  @Column({ name: 'cash_register_id' })
  cashRegisterId: string;

  @ManyToOne('CashRegister', 'sessions')
  @JoinColumn({ name: 'cash_register_id' })
  cashRegister: any;

  @Column({ name: 'opened_by_id' })
  openedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'opened_by_id' })
  openedBy: User;

  @Column({
    name: 'opened_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  openedAt: Date;

  @Column({
    name: 'opening_balance',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  openingBalance: number;

  @Column({ name: 'closed_by_id', nullable: true })
  closedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'closed_by_id' })
  closedBy: User;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({
    name: 'closing_balance',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  closingBalance: number;

  @Column({
    name: 'counted_balance',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  countedBalance: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  difference: number;

  @Column({
    type: 'enum',
    enum: CashSessionStatus,
    default: CashSessionStatus.OPEN,
  })
  status: CashSessionStatus;

  @OneToMany('CashMovement', 'session')
  movements: any[];
}
