import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from '../../../common/enums/role.enum';

@Entity('users', { schema: 'business' })
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // Password hidden by default
  password_hash: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: Role, default: Role.CUSTOMER })
  role: Role;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  profile_details: Record<string, any>;

  @Column({ nullable: true })
  restaurant_id: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.users, {
    nullable: true,
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;
}
