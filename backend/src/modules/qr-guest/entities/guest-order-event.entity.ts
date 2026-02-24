import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { GuestOrder } from './guest-order.entity';

export enum GuestOrderEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CONVERTED = 'converted',
  EXPIRED = 'expired',
}

@Entity('guest_order_events', { schema: 'public_api' })
export class GuestOrderEvent extends BaseEntity {
  @Column({ name: 'guest_order_id' })
  guestOrderId: string;

  @ManyToOne(() => GuestOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guest_order_id' })
  guestOrder: GuestOrder;

  @Column({ type: 'enum', enum: GuestOrderEventType })
  type: GuestOrderEventType;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy: string | null;
}
