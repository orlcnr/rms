import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMealVoucherTypeToPayments1772419000000 implements MigrationInterface {
  name = 'AddMealVoucherTypeToPayments1772419000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operations"."payments"
      ADD COLUMN IF NOT EXISTS "meal_voucher_type" character varying(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operations"."payments"
      DROP COLUMN IF EXISTS "meal_voucher_type"
    `);
  }
}
