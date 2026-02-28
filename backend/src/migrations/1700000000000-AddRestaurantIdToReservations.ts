import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRestaurantIdToReservations1700000000000 implements MigrationInterface {
  name = 'AddRestaurantIdToReservations1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add restaurant_id column to reservations table
    await queryRunner.query(`
      ALTER TABLE "business"."reservations" 
      ADD COLUMN "restaurant_id" UUID NOT NULL DEFAULT uuid_generate_v4()
    `);

    // Create index for efficient queries
    await queryRunner.query(`
      CREATE INDEX "idx_reservations_restaurant_time" 
      ON "business"."reservations" ("restaurant_id", "reservation_time")
    `);

    // Set restaurant_id from the table's restaurant_id for existing reservations
    await queryRunner.query(`
      UPDATE "business"."reservations" r
      SET restaurant_id = t.restaurant_id
      FROM "business"."tables" t
      WHERE r.table_id = t.id
    `);

    // Remove default value after populating existing data
    await queryRunner.query(`
      ALTER TABLE "business"."reservations" 
      ALTER COLUMN "restaurant_id" DROP DEFAULT
    `);

    // Make column not nullable after populating data
    await queryRunner.query(`
      ALTER TABLE "business"."reservations" 
      ALTER COLUMN "restaurant_id" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_reservations_restaurant_time"
    `);
    await queryRunner.query(`
      ALTER TABLE "business"."reservations" 
      DROP COLUMN IF EXISTS "restaurant_id"
    `);
  }
}
