import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureCustomersSoftDeleteColumn1773500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE business.customers
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_restaurant_deleted_at
      ON business.customers (restaurant_id, deleted_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS business.idx_customers_restaurant_deleted_at
    `);

    await queryRunner.query(`
      ALTER TABLE business.customers
      DROP COLUMN IF EXISTS deleted_at
    `);
  }
}

