import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceCycleVersionToTables1772423000000
  implements MigrationInterface
{
  name = 'AddServiceCycleVersionToTables1772423000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "business"."tables"
      ADD COLUMN IF NOT EXISTS "service_cycle_version" bigint NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "business"."tables"
      DROP COLUMN IF EXISTS "service_cycle_version"
    `);
  }
}
