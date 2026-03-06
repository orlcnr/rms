import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchCategoryOverrides1772503000000 implements MigrationInterface {
  name = 'AddBranchCategoryOverrides1772503000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "business"."branch_category_overrides" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "branch_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "action" character varying NOT NULL,
        CONSTRAINT "CHK_branch_category_overrides_action" CHECK ("action" IN ('hide')),
        CONSTRAINT "PK_branch_category_overrides_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_category_overrides_branch_category" UNIQUE ("branch_id", "category_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_branch_category_override_branch_category"
      ON "business"."branch_category_overrides" ("branch_id", "category_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."branch_category_overrides"
      ADD CONSTRAINT "FK_branch_category_overrides_branch" FOREIGN KEY ("branch_id") REFERENCES "business"."restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."branch_category_overrides"
      ADD CONSTRAINT "FK_branch_category_overrides_category" FOREIGN KEY ("category_id") REFERENCES "business"."categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business"."branch_category_overrides" DROP CONSTRAINT IF EXISTS "FK_branch_category_overrides_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."branch_category_overrides" DROP CONSTRAINT IF EXISTS "FK_branch_category_overrides_branch"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "business"."idx_branch_category_override_branch_category"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "business"."branch_category_overrides"`,
    );
  }
}
