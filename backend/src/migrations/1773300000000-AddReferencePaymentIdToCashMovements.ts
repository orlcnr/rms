import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferencePaymentIdToCashMovements1773300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE operations.cash_movements
      ADD COLUMN IF NOT EXISTS reference_payment_id uuid
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cash_movements_reference_payment_id
      ON operations.cash_movements (reference_payment_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS operations.idx_cash_movements_reference_payment_id
    `);

    await queryRunner.query(`
      ALTER TABLE operations.cash_movements
      DROP COLUMN IF EXISTS reference_payment_id
    `);
  }
}
