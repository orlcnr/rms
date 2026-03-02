import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentsRestaurantStatusCreatedAtIndex1772412000000 implements MigrationInterface {
  name = 'AddPaymentsRestaurantStatusCreatedAtIndex1772412000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_restaurant_status_created_at"
      ON "operations"."payments" ("restaurant_id", "status", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "operations"."idx_payments_restaurant_status_created_at"
    `);
  }
}
