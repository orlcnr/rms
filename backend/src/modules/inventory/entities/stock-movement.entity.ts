import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Ingredient } from './ingredient.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUST = 'ADJUST',
}

@Entity('stock_movements', { schema: 'operations' })
export class StockMovement extends BaseEntity {
  @Column()
  ingredient_id: string;

  @ManyToOne(() => Ingredient)
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;

  @Column({
    type: 'enum',
    enum: MovementType,
  })
  type: MovementType;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: 'uuid', nullable: true })
  branch_id: string | null;

  @ManyToOne(() => Restaurant, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Restaurant | null;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true })
  base_quantity: number | null;

  @Column({ nullable: true })
  reason: string; // SALE, PURCHASE, WASTE, COUNT, ADJUSTMENT

  @Column({ nullable: true })
  reference_id: string; // order_id, purchase_id, etc.

  // Maliyet alanları
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unit_price: number; // Birim fiyat (giriş hareketlerinde)

  @Column({ nullable: true })
  supplier_id: string; // Tedarikçi ID (giriş hareketlerinde)
}
