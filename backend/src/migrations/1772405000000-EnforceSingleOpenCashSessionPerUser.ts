import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceSingleOpenCashSessionPerUser1772405000000 implements MigrationInterface {
  name = 'EnforceSingleOpenCashSessionPerUser1772405000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operations"."cash_sessions" ADD COLUMN IF NOT EXISTS "restaurant_id" uuid`,
    );

    await queryRunner.query(`
      UPDATE "operations"."cash_sessions" AS session
      SET "restaurant_id" = register."restaurant_id"
      FROM "operations"."cash_registers" AS register
      WHERE session."cash_register_id" = register."id"
        AND session."restaurant_id" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cash_sessions_single_open_per_user_restaurant"
      ON "operations"."cash_sessions" ("restaurant_id", "opened_by_id")
      WHERE "status" = 'open'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "operations"."IDX_cash_sessions_single_open_per_user_restaurant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."cash_sessions" DROP COLUMN IF EXISTS "restaurant_id"`,
    );
  }
}
