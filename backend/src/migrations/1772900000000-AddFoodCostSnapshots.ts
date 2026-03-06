import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFoodCostSnapshots1772900000000 implements MigrationInterface {
  name = 'AddFoodCostSnapshots1772900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS operations.food_cost_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id uuid NOT NULL REFERENCES business.restaurants(id) ON DELETE CASCADE,
        snapshot_date date NOT NULL,
        alerts jsonb NOT NULL DEFAULT '[]'::jsonb,
        computed_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE(branch_id, snapshot_date)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_food_cost_snapshots_branch_date
      ON operations.food_cost_snapshots (branch_id, snapshot_date)
    `);

    await queryRunner.query(`
      INSERT INTO business.restaurant_settings (
        id,
        restaurant_id,
        key,
        value,
        type,
        "group",
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        r.id,
        'food_cost_alert_threshold_percent',
        '35',
        'number',
        'cash',
        NOW(),
        NOW()
      FROM business.restaurants r
      WHERE r.deleted_at IS NULL
      ON CONFLICT (restaurant_id, key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM business.restaurant_settings
      WHERE key = 'food_cost_alert_threshold_percent'
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS operations.idx_food_cost_snapshots_branch_date
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS operations.food_cost_snapshots
    `);
  }
}
