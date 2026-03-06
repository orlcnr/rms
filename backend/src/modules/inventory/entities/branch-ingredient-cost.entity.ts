import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Ingredient } from './ingredient.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('branch_ingredient_costs', { schema: 'operations' })
@Unique('UQ_branch_ingredient_costs_ingredient_branch', [
  'ingredient_id',
  'branch_id',
])
export class BranchIngredientCost extends BaseEntity {
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

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  average_cost: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  last_price: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  previous_price: number | null;

  @Column({ type: 'timestamp', nullable: true })
  price_updated_at: Date | null;
}
