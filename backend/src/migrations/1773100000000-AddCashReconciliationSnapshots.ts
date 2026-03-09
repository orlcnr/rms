import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCashReconciliationSnapshots1773100000000
  implements MigrationInterface
{
  name = 'AddCashReconciliationSnapshots1773100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS operations.cash_reconciliation_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid NOT NULL REFERENCES operations.cash_sessions(id) ON DELETE CASCADE,
        restaurant_id uuid NOT NULL REFERENCES business.restaurants(id) ON DELETE CASCADE,
        report jsonb NOT NULL,
        computed_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz NULL,
        CONSTRAINT uq_cash_reconciliation_snapshots_session_id UNIQUE (session_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cash_reconciliation_snapshots_restaurant_session
      ON operations.cash_reconciliation_snapshots (restaurant_id, session_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS operations.idx_cash_reconciliation_snapshots_restaurant_session
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS operations.cash_reconciliation_snapshots
    `);
  }
}

