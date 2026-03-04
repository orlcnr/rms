import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubtypeToCashMovements1772422000000 implements MigrationInterface {
  name = 'AddSubtypeToCashMovements1772422000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operations"."cash_movements"
      ADD COLUMN IF NOT EXISTS "subtype" character varying(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operations"."cash_movements"
      DROP COLUMN IF EXISTS "subtype"
    `);
  }
}
