import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('brands', { schema: 'business' })
export class Brand extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'owner_id' })
  owner_id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => Restaurant, (restaurant) => restaurant.brand)
  branches: Restaurant[];
}
