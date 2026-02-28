import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryCostFields1739999999999 implements MigrationInterface {
  name = 'AddInventoryCostFields1739999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns to ingredients table
    await queryRunner.query(`
      ALTER TABLE operations.ingredients 
      ADD COLUMN IF NOT EXISTS average_cost DECIMAL(10, 2) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE operations.ingredients 
      ADD COLUMN IF NOT EXISTS last_price DECIMAL(10, 2) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE operations.ingredients 
      ADD COLUMN IF NOT EXISTS previous_price DECIMAL(10, 2) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE operations.ingredients 
      ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMP NULL
    `);

    // Add columns to stock_movements table
    await queryRunner.query(`
      ALTER TABLE operations.stock_movements 
      ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE operations.stock_movements 
      ADD COLUMN IF NOT EXISTS supplier_id UUID NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from stock_movements table
    await queryRunner.query(`
      ALTER TABLE operations.stock_movements 
      DROP COLUMN IF EXISTS supplier_id
    `);

    await queryRunner.query(`
      ALTER TABLE operations.stock_movements 
      DROP COLUMN IF EXISTS unit_price
    `);

    // Remove columns from ingredients table
    await queryRunner.query(`
      ALTER TABLE operations.ingredients 
      DROP COLUMN IF EXISTS price_updated_at
    `);

    await queryRunner.query(`
      ALTER TABLE operations.ingredients 
      DROP COLUMN IF EXISTS previous_price
    `);

    await queryRunner.query(`
      ALTER TABLE operations.ingredients 
      DROP COLUMN IF EXISTS last_price
    `);

    await queryRunner.query(`
      ALTER TABLE operations.ingredients 
      DROP COLUMN IF EXISTS average_cost
    `);
  }
}
