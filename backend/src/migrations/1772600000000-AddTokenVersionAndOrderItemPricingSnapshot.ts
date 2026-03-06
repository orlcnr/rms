import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenVersionAndOrderItemPricingSnapshot1772600000000 implements MigrationInterface {
  name = 'AddTokenVersionAndOrderItemPricingSnapshot1772600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "business"."users"
      ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 1
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."order_items"
      ADD COLUMN IF NOT EXISTS "base_price" numeric(10,2)
    `);
    await queryRunner.query(`
      ALTER TABLE "business"."order_items"
      ADD COLUMN IF NOT EXISTS "override_price" numeric(10,2)
    `);
    await queryRunner.query(`
      ALTER TABLE "business"."order_items"
      ADD COLUMN IF NOT EXISTS "unit_price_locked" numeric(10,2)
    `);

    await queryRunner.query(`
      UPDATE "business"."order_items"
      SET "base_price" = "unit_price"
      WHERE "base_price" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "business"."order_items"
      SET "unit_price_locked" = "unit_price"
      WHERE "unit_price_locked" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "business"."order_items"
      DROP COLUMN IF EXISTS "unit_price_locked"
    `);
    await queryRunner.query(`
      ALTER TABLE "business"."order_items"
      DROP COLUMN IF EXISTS "override_price"
    `);
    await queryRunner.query(`
      ALTER TABLE "business"."order_items"
      DROP COLUMN IF EXISTS "base_price"
    `);
    await queryRunner.query(`
      ALTER TABLE "business"."users"
      DROP COLUMN IF EXISTS "token_version"
    `);
  }
}
