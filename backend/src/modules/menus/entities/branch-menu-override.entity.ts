import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { MenuItem } from './menu-item.entity';

@Entity('branch_menu_overrides', { schema: 'business' })
@Unique('uq_branch_menu_override_branch_item', ['branch_id', 'menu_item_id'])
@Index('idx_overrides_branch_item', ['branch_id', 'menu_item_id'])
export class BranchMenuOverride extends BaseEntity {
  @Column({ name: 'branch_id' })
  branch_id: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Restaurant;

  @Column({ name: 'menu_item_id' })
  menu_item_id: string;

  @ManyToOne(() => MenuItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;

  @Column({ type: 'varchar' })
  action: 'hide';

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  custom_price: number | null;
}
