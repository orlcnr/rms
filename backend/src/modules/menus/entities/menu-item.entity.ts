import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Category } from './category.entity';
import { Recipe } from '../../inventory/entities/recipe.entity';

@Entity('menu_items', { schema: 'business' })
export class MenuItem extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  image_url: string;

  @Column({ default: true })
  is_available: boolean;

  @Column({ default: false })
  track_inventory: boolean;

  @Column({ default: 0 })
  popularity: number;

  @Column()
  category_id: string;

  @ManyToOne(() => Category, (category) => category.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => Recipe, (recipe) => recipe.product)
  recipes: Recipe[];
}
