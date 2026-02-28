import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Table } from '../../tables/entities/table.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Entity('reservations', { schema: 'business' })
@Index('idx_reservations_restaurant_time', [
  'restaurant_id',
  'reservation_time',
])
export class Reservation extends BaseEntity {
  @Column({ name: 'restaurant_id' })
  restaurant_id: string;

  @Column()
  customer_id: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column()
  table_id: string;

  @ManyToOne(() => Table, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @Column({ type: 'timestamp' })
  reservation_time: Date;

  @Column({ type: 'int' })
  guest_count: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  prepayment_amount: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
