import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSingleOpenCashSessionPerUserIndex1772421000000 implements MigrationInterface {
  name = 'RemoveSingleOpenCashSessionPerUserIndex1772421000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "operations"."IDX_cash_sessions_single_open_per_user_restaurant"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cash_sessions_single_open_per_user_restaurant"
      ON "operations"."cash_sessions" ("restaurant_id", "opened_by_id")
      WHERE "status" = 'open'
    `);
  }
}
