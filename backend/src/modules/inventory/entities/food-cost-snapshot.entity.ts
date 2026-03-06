import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('food_cost_snapshots', { schema: 'operations' })
@Unique(['branch_id', 'snapshot_date'])
@Index('idx_food_cost_snapshots_branch_date', ['branch_id', 'snapshot_date'])
export class FoodCostSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  branch_id: string;

  @Column({ type: 'date' })
  snapshot_date: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  alerts: Array<{
    product_id: string;
    product_name: string;
    current_price: number;
    recipe_cost: number;
    food_cost_percent: number;
    suggested_price: number;
  }>;

  @Column({ type: 'timestamptz' })
  computed_at: Date;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
