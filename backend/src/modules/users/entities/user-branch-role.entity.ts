import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Role } from '../../../common/enums/role.enum';
import { Brand } from '../../brands/entities/brand.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { User } from './user.entity';

@Entity('user_branch_roles', { schema: 'business' })
@Unique('uq_user_branch_roles_scope', [
  'user_id',
  'brand_id',
  'branch_id',
  'role',
])
@Index('idx_user_branch_roles_user', ['user_id'])
@Index('idx_user_branch_roles_scope_lookup', ['brand_id', 'branch_id', 'role'])
export class UserBranchRole extends BaseEntity {
  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'brand_id' })
  brand_id: string;

  @ManyToOne(() => Brand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ name: 'branch_id', nullable: true })
  branch_id: string | null;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Restaurant | null;

  @Column({ type: 'enum', enum: Role })
  role: Role;
}
