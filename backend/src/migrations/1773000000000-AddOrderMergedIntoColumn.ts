import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderMergedIntoColumn1773000000000 implements MigrationInterface {
  name = 'AddOrderMergedIntoColumn1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE business.orders
      ADD COLUMN IF NOT EXISTS merged_into uuid NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_orders_merged_into'
        ) THEN
          ALTER TABLE business.orders
          ADD CONSTRAINT fk_orders_merged_into
          FOREIGN KEY (merged_into)
          REFERENCES business.orders(id)
          ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_merged_into
      ON business.orders (merged_into)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS business.idx_orders_merged_into
    `);

    await queryRunner.query(`
      ALTER TABLE business.orders
      DROP CONSTRAINT IF EXISTS fk_orders_merged_into
    `);

    await queryRunner.query(`
      ALTER TABLE business.orders
      DROP COLUMN IF EXISTS merged_into
    `);
  }
}
