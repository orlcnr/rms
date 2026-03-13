import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Category } from './category.entity';
import { Recipe } from '../../inventory/entities/recipe.entity';
import { Brand } from '../../brands/entities/brand.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

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

  @Column({ default: true })
  requires_kitchen: boolean;

  @Column({ default: 0 })
  popularity: number;

  @Column()
  restaurant_id: string;

  @Column({ nullable: true })
  brand_id: string;

  @Column({ nullable: true })
  branch_id: string;

  @Column()
  category_id: string;

  @ManyToOne(() => Category, (category) => category.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @ManyToOne(() => Restaurant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Restaurant;

  @OneToMany(() => Recipe, (recipe) => recipe.product)
  recipes: Recipe[];
}
