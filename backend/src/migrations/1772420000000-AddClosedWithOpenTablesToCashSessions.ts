import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClosedWithOpenTablesToCashSessions1772420000000 implements MigrationInterface {
  name = 'AddClosedWithOpenTablesToCashSessions1772420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operations"."cash_sessions"
      ADD COLUMN IF NOT EXISTS "closed_with_open_tables" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operations"."cash_sessions"
      DROP COLUMN IF EXISTS "closed_with_open_tables"
    `);
  }
}
