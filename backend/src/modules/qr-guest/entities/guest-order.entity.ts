import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Table } from '../../tables/entities/table.entity';

export enum GuestOrderStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
}

export interface GuestOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

@Entity('guest_orders', { schema: 'public_api' })
export class GuestOrder extends BaseEntity {
  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'table_id' })
  tableId: string;

  @ManyToOne(() => Table)
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({
    type: 'enum',
    enum: GuestOrderStatus,
    default: GuestOrderStatus.DRAFT,
  })
  status: GuestOrderStatus;

  @Column({ type: 'jsonb' })
  items: GuestOrderItem[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({ name: 'converted_order_id', type: 'uuid', nullable: true })
  convertedOrderId: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  @Column({ name: 'rejected_reason', type: 'text', nullable: true })
  rejectedReason: string | null;

  @Column({ name: 'client_request_id', type: 'text', nullable: true })
  clientRequestId: string | null;
}
