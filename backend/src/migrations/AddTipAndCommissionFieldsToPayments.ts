import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTipAndCommissionFieldsToPayments1700000000000 implements MigrationInterface {
  name = 'AddTipAndCommissionFieldsToPayments1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tip_amount column
    await queryRunner.query(`
      ALTER TABLE operations.payments 
      ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10, 2) NULL
    `);

    // Add commission_rate column
    await queryRunner.query(`
      ALTER TABLE operations.payments 
      ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2) NULL
    `);

    // Add net_tip_amount column
    await queryRunner.query(`
      ALTER TABLE operations.payments 
      ADD COLUMN IF NOT EXISTS net_tip_amount DECIMAL(10, 2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE operations.payments 
      DROP COLUMN IF EXISTS net_tip_amount
    `);
    await queryRunner.query(`
      ALTER TABLE operations.payments 
      DROP COLUMN IF EXISTS commission_rate
    `);
    await queryRunner.query(`
      ALTER TABLE operations.payments 
      DROP COLUMN IF EXISTS tip_amount
    `);
  }
}
