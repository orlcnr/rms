import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { MenuItem } from './menu-item.entity';
import { Brand } from '../../brands/entities/brand.entity';

@Entity('categories', { schema: 'business' })
export class Category extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  restaurant_id: string;

  @Column({ nullable: true })
  brand_id: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @OneToMany(() => MenuItem, (menuItem) => menuItem.category)
  items: MenuItem[];
}
