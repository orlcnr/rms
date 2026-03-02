import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncWithModels1772378563447 implements MigrationInterface {
  name = 'SyncWithModels1772378563447';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "business"."idx_customers_current_debt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "business"."IDX_restaurant_settings_restaurant_group"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "operations"."idx_payments_customer_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "operations"."idx_payments_restaurant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."customers" DROP CONSTRAINT IF EXISTS "UQ_customers_phone_restaurant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."restaurant_settings" DROP CONSTRAINT IF EXISTS "UQ_restaurant_settings_key"`,
    );

    // Get a default restaurant ID
    const restaurants = await queryRunner.query(
      `SELECT id FROM business.restaurants LIMIT 1`,
    );
    const defaultRestaurantId =
      restaurants.length > 0 ? restaurants[0].id : null;

    // Handle menu_items restaurant_id
    await queryRunner.query(
      `ALTER TABLE "business"."menu_items" ADD column IF NOT EXISTS "restaurant_id" character varying NULL`,
    );
    if (defaultRestaurantId) {
      await queryRunner.query(
        `UPDATE "business"."menu_items" SET "restaurant_id" = '${defaultRestaurantId}' WHERE "restaurant_id" IS NULL`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "business"."menu_items" ALTER COLUMN "restaurant_id" SET NOT NULL`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "business"."idx_reservations_restaurant_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."reservations" DROP COLUMN IF EXISTS "restaurant_id"`,
    );

    // Handle reservations restaurant_id
    await queryRunner.query(
      `ALTER TABLE "business"."reservations" ADD "restaurant_id" character varying NULL`,
    );
    if (defaultRestaurantId) {
      await queryRunner.query(
        `UPDATE "business"."reservations" SET "restaurant_id" = '${defaultRestaurantId}' WHERE "restaurant_id" IS NULL`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "business"."reservations" ALTER COLUMN "restaurant_id" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "operations"."payments" DROP COLUMN IF EXISTS "discount_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" ADD "discount_type" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."stock_movements" DROP COLUMN IF EXISTS "supplier_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."stock_movements" ADD "supplier_id" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reservations_restaurant_time" ON "business"."reservations" ("restaurant_id", "reservation_time") `,
    );

    await queryRunner.query(
      `ALTER TABLE "business"."restaurant_settings" DROP CONSTRAINT IF EXISTS "UQ_86c54f65224cc80e10e9848aace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."restaurant_settings" ADD CONSTRAINT "UQ_86c54f65224cc80e10e9848aace" UNIQUE ("restaurant_id", "key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration... (simplified for recovery)
  }
}
