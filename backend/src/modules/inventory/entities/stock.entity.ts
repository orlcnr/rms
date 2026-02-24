import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Ingredient } from './ingredient.entity';

@Entity('stocks', { schema: 'operations' })
export class Stock extends BaseEntity {
  @Column()
  ingredient_id: string;

  @OneToOne(() => Ingredient)
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantity: number;
}
