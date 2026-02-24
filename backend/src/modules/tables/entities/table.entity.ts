import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Area } from './area.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  OUT_OF_SERVICE = 'out_of_service',
}

@Entity('tables', { schema: 'business' })
export class Table extends BaseEntity {
  @Column()
  name: string; // "Table 1", "T-15"

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'enum', enum: TableStatus, default: TableStatus.AVAILABLE })
  status: TableStatus;

  @Column({ nullable: true })
  qr_code_url: string; // Link to menu/ordering for this table

  @Column({ name: 'qr_version', type: 'int', default: 1 })
  qrVersion: number;

  @Column()
  restaurant_id: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ nullable: true })
  area_id: string;

  @ManyToOne(() => Area, (area) => area.tables, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @OneToMany(() => Reservation, (reservation) => reservation.table)
  reservations: Reservation[];
}
