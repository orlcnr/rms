import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryBrandScopeAndOutbox1772700000000 implements MigrationInterface {
  name = 'InventoryBrandScopeAndOutbox1772700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operations"."ingredients"
      ADD COLUMN IF NOT EXISTS "brand_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "operations"."ingredients"
      ADD COLUMN IF NOT EXISTS "base_unit" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "operations"."ingredients"
      ADD COLUMN IF NOT EXISTS "unit_group" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "operations"."ingredients"
      ADD COLUMN IF NOT EXISTS "pack_size" numeric(12,4)
    `);

    await queryRunner.query(`
      UPDATE "operations"."ingredients" i
      SET "brand_id" = r."brand_id"
      FROM "business"."restaurants" r
      WHERE i."restaurant_id" = r."id"::text
        AND i."brand_id" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ingredients_brand_id"
      ON "operations"."ingredients" ("brand_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "operations"."ingredients"
      ADD CONSTRAINT "FK_ingredients_brand"
      FOREIGN KEY ("brand_id") REFERENCES "business"."brands"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      UPDATE "operations"."ingredients"
      SET "base_unit" = CASE
        WHEN "unit" = 'kg' THEN 'gr'
        WHEN "unit" = 'gr' THEN 'gr'
        WHEN "unit" = 'lt' THEN 'ml'
        WHEN "unit" = 'ml' THEN 'ml'
        ELSE 'adet'
      END
      WHERE "base_unit" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "operations"."ingredients"
      SET "unit_group" = CASE
        WHEN "unit" IN ('kg', 'gr') THEN 'weight'
        WHEN "unit" IN ('lt', 'ml') THEN 'volume'
        ELSE 'piece'
      END
      WHERE "unit_group" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "operations"."ingredients"
      SET "pack_size" = 1
      WHERE "pack_size" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "operations"."branch_stocks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "ingredient_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "quantity" numeric(12,4) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_branch_stocks_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_stocks_ingredient_branch" UNIQUE ("ingredient_id", "branch_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_branch_stocks_branch_ingredient"
      ON "operations"."branch_stocks" ("branch_id", "ingredient_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "operations"."branch_stocks"
      ADD CONSTRAINT "FK_branch_stocks_ingredient"
      FOREIGN KEY ("ingredient_id") REFERENCES "operations"."ingredients"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "operations"."branch_stocks"
      ADD CONSTRAINT "FK_branch_stocks_branch"
      FOREIGN KEY ("branch_id") REFERENCES "business"."restaurants"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      INSERT INTO "operations"."branch_stocks" ("ingredient_id", "branch_id", "quantity")
      SELECT i."id", i."restaurant_id"::uuid, COALESCE(s."quantity", 0)
      FROM "operations"."ingredients" i
      LEFT JOIN "operations"."stocks" s ON s."ingredient_id" = i."id"
      WHERE i."restaurant_id" IS NOT NULL
        AND i."restaurant_id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      ON CONFLICT ("ingredient_id", "branch_id") DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "operations"."stock_movements"
      ADD COLUMN IF NOT EXISTS "branch_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "operations"."stock_movements"
      ADD COLUMN IF NOT EXISTS "unit" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "operations"."stock_movements"
      ADD COLUMN IF NOT EXISTS "base_quantity" numeric(12,4)
    `);
    await queryRunner.query(`
      UPDATE "operations"."stock_movements" sm
      SET "branch_id" = i."restaurant_id"::uuid,
          "unit" = COALESCE(sm."unit", i."base_unit", i."unit"),
          "base_quantity" = COALESCE(sm."base_quantity", sm."quantity")
      FROM "operations"."ingredients" i
      WHERE sm."ingredient_id" = i."id"
        AND i."restaurant_id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_stock_movements_branch_id"
      ON "operations"."stock_movements" ("branch_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "operations"."stock_movements"
      ADD CONSTRAINT "FK_stock_movements_branch"
      FOREIGN KEY ("branch_id") REFERENCES "business"."restaurants"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "operations"."recipes"
      ADD COLUMN IF NOT EXISTS "unit" character varying
    `);
    await queryRunner.query(`
      UPDATE "operations"."recipes" r
      SET "unit" = COALESCE(r."unit", i."base_unit", i."unit", 'adet')
      FROM "operations"."ingredients" i
      WHERE r."ingredient_id" = i."id"
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "operations"."outbox_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "aggregate_type" character varying NOT NULL,
        "aggregate_id" uuid,
        "event_type" character varying NOT NULL,
        "event_version" integer NOT NULL DEFAULT 1,
        "payload" jsonb NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "retry_count" integer NOT NULL DEFAULT 0,
        "next_retry_at" TIMESTAMP,
        "published_at" TIMESTAMP,
        CONSTRAINT "PK_outbox_events_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_outbox_pending"
      ON "operations"."outbox_events" ("status", "next_retry_at", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "operations"."idx_outbox_pending"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "operations"."outbox_events"`,
    );

    await queryRunner.query(
      `ALTER TABLE "operations"."recipes" DROP COLUMN IF EXISTS "unit"`,
    );

    await queryRunner.query(
      `ALTER TABLE "operations"."stock_movements" DROP CONSTRAINT IF EXISTS "FK_stock_movements_branch"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "operations"."idx_stock_movements_branch_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."stock_movements" DROP COLUMN IF EXISTS "base_quantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."stock_movements" DROP COLUMN IF EXISTS "unit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."stock_movements" DROP COLUMN IF EXISTS "branch_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "operations"."branch_stocks" DROP CONSTRAINT IF EXISTS "FK_branch_stocks_branch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."branch_stocks" DROP CONSTRAINT IF EXISTS "FK_branch_stocks_ingredient"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "operations"."idx_branch_stocks_branch_ingredient"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "operations"."branch_stocks"`,
    );

    await queryRunner.query(
      `ALTER TABLE "operations"."ingredients" DROP COLUMN IF EXISTS "pack_size"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."ingredients" DROP COLUMN IF EXISTS "unit_group"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."ingredients" DROP COLUMN IF EXISTS "base_unit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."ingredients" DROP CONSTRAINT IF EXISTS "FK_ingredients_brand"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "operations"."idx_ingredients_brand_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."ingredients" DROP COLUMN IF EXISTS "brand_id"`,
    );
  }
}
