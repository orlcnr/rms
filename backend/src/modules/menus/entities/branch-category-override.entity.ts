import { BaseEntity } from '../../../common/entities/base.entity';
import { Category } from './category.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('branch_category_overrides', { schema: 'business' })
@Unique('uq_branch_category_override_branch_category', [
  'branch_id',
  'category_id',
])
@Index('idx_branch_category_override_branch_category', [
  'branch_id',
  'category_id',
])
export class BranchCategoryOverride extends BaseEntity {
  @Column({ name: 'branch_id' })
  branch_id: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Restaurant;

  @Column({ name: 'category_id' })
  category_id: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'varchar' })
  action: 'hide';
}
