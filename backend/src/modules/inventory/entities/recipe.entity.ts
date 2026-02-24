import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MenuItem } from '../../menus/entities/menu-item.entity';
import { Ingredient } from './ingredient.entity';

@Entity('recipes', { schema: 'operations' })
export class Recipe extends BaseEntity {
  @Column()
  product_id: string;

  @ManyToOne(() => MenuItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: MenuItem;

  @Column()
  ingredient_id: string;

  @ManyToOne(() => Ingredient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;
}
