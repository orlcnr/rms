import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Table } from './table.entity';

@Entity('areas', { schema: 'business' })
export class Area extends BaseEntity {
  @Column()
  name: string; // e.g., "Main Hall", "Terrace"

  @Column()
  restaurant_id: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @OneToMany(() => Table, (table) => table.area)
  tables: Table[];
}
