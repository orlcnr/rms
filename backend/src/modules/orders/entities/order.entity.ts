import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Table } from '../../tables/entities/table.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { OrderItem } from './order-item.entity';

import { OrderStatus } from '../enums/order-status.enum';
import { OrderType } from '../enums/order-type.enum';
import { OrderSource } from '../enums/order-source.enum';
export { OrderStatus, OrderType, OrderSource };

@Entity('orders', { schema: 'business' })
export class Order extends BaseEntity {
  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'table_id', type: 'uuid', nullable: true })
  tableId: string | null;

  @ManyToOne(() => Table, { nullable: true })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.DINE_IN,
  })
  type: OrderType;

  @Column({
    type: 'enum',
    enum: OrderSource,
    default: OrderSource.INTERNAL,
  })
  source: OrderSource;

  @Column({ name: 'external_id', type: 'text', nullable: true })
  externalId: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({
    name: 'delivery_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  deliveryFee: number;

  @Column({
    name: 'integration_metadata',
    type: 'jsonb',
    nullable: true,
  })
  integrationMetadata: any | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'order_number', type: 'text', nullable: true })
  orderNumber: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
