import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum NotificationType {
  NEW_ORDER = 'new_order',
  ORDER_STATUS = 'order_status',
  GUEST_ORDER = 'guest_order',
  WAITER_CALL = 'waiter_call',
  BILL_REQUEST = 'bill_request',
  SYSTEM = 'system',
}

@Entity('notifications', { schema: 'infrastructure' })
export class Notification extends BaseEntity {
  @Column({ name: 'restaurant_id', type: 'varchar' })
  @Index()
  restaurantId: string;

  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  @Index()
  userId: string | null;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;
}
