import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Ingredient } from './ingredient.entity';

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
