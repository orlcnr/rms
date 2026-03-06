import { Entity, Column, JoinColumn, ManyToOne, Unique, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Ingredient } from './ingredient.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('branch_stocks', { schema: 'operations' })
@Unique('UQ_branch_stocks_ingredient_branch', ['ingredient_id', 'branch_id'])
export class BranchStock extends BaseEntity {
  @Column()
  @Index()
  ingredient_id: string;

  @Column()
  @Index()
  branch_id: string;

  @ManyToOne(() => Ingredient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Restaurant;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  quantity: number;
}
