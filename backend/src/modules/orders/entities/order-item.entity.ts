import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from './order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { MenuItem } from '../../menus/entities/menu-item.entity';

@Entity('order_items', { schema: 'business' })
export class OrderItem extends BaseEntity {
  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'menu_item_id' })
  menuItemId: string;

  @ManyToOne(() => MenuItem)
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({
    name: 'base_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  basePrice: number | null;

  @Column({
    name: 'override_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  overridePrice: number | null;

  @Column({
    name: 'unit_price_locked',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  unitPriceLocked: number | null;

  @Column({ name: 'subtotal', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number; // Mapping frontend totalPrice to backend subtotal

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;
}
