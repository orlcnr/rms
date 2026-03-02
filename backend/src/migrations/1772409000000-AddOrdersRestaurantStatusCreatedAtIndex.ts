import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrdersRestaurantStatusCreatedAtIndex1772409000000 implements MigrationInterface {
  name = 'AddOrdersRestaurantStatusCreatedAtIndex1772409000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_restaurant_status_created_at"
      ON "business"."orders" ("restaurant_id", "status", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "business"."idx_orders_restaurant_status_created_at"
    `);
  }
}
