import {
  Entity,
  Column,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
// Will add Reservation relation later to avoid circular dependency issues initially
// import { Reservation } from '../../reservations/entities/reservation.entity';

@Entity('customers', { schema: 'business' })
export class Customer extends BaseEntity {
  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column()
  @Index('idx_customers_phone_restaurant', ['phone', 'restaurantId'])
  phone: string;

  @Column({ nullable: true })
  email: string;

  // ===== Multi-tenant: Restaurant ilişkisi =====

  @Column({ name: 'restaurant_id' })
  @Index('idx_customers_restaurant')
  restaurantId: string;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ type: 'int', default: 0 })
  visit_count: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_spent: number;

  // ===== YENİ: Borç Alanları =====

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_debt: number; // Toplam borç (tarihsel)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  current_debt: number; // Mevcut borç (ödenmemiş)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  credit_limit: number; // Kredi limiti (0 = limitsiz)

  @Column({ type: 'boolean', default: false })
  credit_limit_enabled: boolean; // Limit kontrolü aktif mi?

  @Column({ name: 'max_open_orders', type: 'int', default: 5 })
  max_open_orders: number; // Maksimum açık sipariş sayısı

  // ===== Mevcut Alanlar =====

  @Column({ type: 'timestamp', nullable: true })
  last_visit: Date;

  @Column({ type: 'text', nullable: true })
  notes: string; // Allergies, preferences etc.

  @Column({ type: 'simple-array', nullable: true })
  tags: string[]; // "VIP", "Aggressive", "Regular"

  // @OneToMany(() => Reservation, (reservation) => reservation.customer)
  // reservations: Reservation[];
}
