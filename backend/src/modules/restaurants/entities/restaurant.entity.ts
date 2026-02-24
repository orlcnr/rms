import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('restaurants', { schema: 'business' })
export class Restaurant extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  contact_email: string;

  @Column({ nullable: true })
  contact_phone: string;

  @Column({ type: 'jsonb', nullable: true })
  opening_hours: Record<string, any>; // e.g., { mon: { open: '09:00', close: '22:00' } }

  @Column({ nullable: true })
  google_comment_url: string;

  @Column({ nullable: true })
  instagram_url: string;

  @Column({ nullable: true })
  facebook_url: string;

  @Column({ nullable: true })
  twitter_url: string;

  @Column({ nullable: true })
  website_url: string;

  @Column()
  owner_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => User, (user) => user.restaurant)
  users: User[];

  @Column({ default: true })
  is_active: boolean;
}
