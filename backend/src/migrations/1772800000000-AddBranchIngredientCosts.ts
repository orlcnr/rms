import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchIngredientCosts1772800000000 implements MigrationInterface {
  name = 'AddBranchIngredientCosts1772800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "operations"."branch_ingredient_costs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "ingredient_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "average_cost" numeric(10,2),
        "last_price" numeric(10,2),
        "previous_price" numeric(10,2),
        "price_updated_at" TIMESTAMP,
        CONSTRAINT "PK_branch_ingredient_costs_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_ingredient_costs_ingredient_branch" UNIQUE ("ingredient_id", "branch_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_branch_ingredient_costs_branch_ingredient"
      ON "operations"."branch_ingredient_costs" ("branch_id", "ingredient_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "operations"."branch_ingredient_costs"
      ADD CONSTRAINT "FK_branch_ingredient_costs_ingredient"
      FOREIGN KEY ("ingredient_id") REFERENCES "operations"."ingredients"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "operations"."branch_ingredient_costs"
      ADD CONSTRAINT "FK_branch_ingredient_costs_branch"
      FOREIGN KEY ("branch_id") REFERENCES "business"."restaurants"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
    const shouldBackfill = nodeEnv === 'production';

    if (shouldBackfill) {
      await queryRunner.query(`
        INSERT INTO "operations"."branch_ingredient_costs" (
          "ingredient_id",
          "branch_id",
          "average_cost",
          "last_price",
          "previous_price",
          "price_updated_at"
        )
        SELECT
          i."id",
          r."id",
          i."average_cost",
          i."last_price",
          i."previous_price",
          i."price_updated_at"
        FROM "operations"."ingredients" i
        INNER JOIN "business"."restaurants" r
          ON r."brand_id" = i."brand_id"
        WHERE i."brand_id" IS NOT NULL
        ON CONFLICT ("ingredient_id", "branch_id") DO NOTHING
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operations"."branch_ingredient_costs" DROP CONSTRAINT IF EXISTS "FK_branch_ingredient_costs_branch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."branch_ingredient_costs" DROP CONSTRAINT IF EXISTS "FK_branch_ingredient_costs_ingredient"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "operations"."idx_branch_ingredient_costs_branch_ingredient"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "operations"."branch_ingredient_costs"`,
    );
  }
}
