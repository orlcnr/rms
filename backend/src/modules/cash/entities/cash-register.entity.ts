import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('cash_registers', { schema: 'operations' })
export class CashRegister extends BaseEntity {
    @Column({ name: 'restaurant_id' })
    restaurantId: string;

    @ManyToOne(() => Restaurant)
    @JoinColumn({ name: 'restaurant_id' })
    restaurant: Restaurant;

    @Column()
    name: string;

    @Column({ default: true })
    active: boolean;

    @OneToMany('CashSession', 'cashRegister')
    sessions: any[];
}
