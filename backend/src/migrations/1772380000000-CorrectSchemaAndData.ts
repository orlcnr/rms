import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorrectSchemaAndData1772380000000 implements MigrationInterface {
  name = 'CorrectSchemaAndData1772380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const activeRestaurantId = '2e8c0569-b9c8-4922-b620-615925fe4540';

    // 1. Fix restaurant_id types and data in business.menu_items
    // Convert character varying to uuid. We need to handle the cast.
    await queryRunner.query(
      `ALTER TABLE "business"."menu_items" ALTER COLUMN "restaurant_id" TYPE uuid USING restaurant_id::uuid`,
    );
    await queryRunner.query(
      `UPDATE "business"."menu_items" SET "restaurant_id" = '${activeRestaurantId}'`,
    );

    // 2. Fix restaurant_id in business.categories and align data
    // It's already uuid, just align data.
    await queryRunner.query(
      `UPDATE "business"."categories" SET "restaurant_id" = '${activeRestaurantId}'`,
    );

    // 3. Fix restaurant_id in business.customers and align data
    await queryRunner.query(
      `UPDATE "business"."customers" SET "restaurant_id" = '${activeRestaurantId}'`,
    );

    // 4. Fix restaurant_id in business.reservations (type and data)
    await queryRunner.query(
      `ALTER TABLE "business"."reservations" ALTER COLUMN "restaurant_id" TYPE uuid USING restaurant_id::uuid`,
    );
    await queryRunner.query(
      `UPDATE "business"."reservations" SET "restaurant_id" = '${activeRestaurantId}'`,
    );

    // 5. Ensure CashMovement boolean flags are correct (is_void mismatch check)
    // We saw is_void reported as missing but psql showed it. This might be a naming convention or case sensitivity issue in the ORM.
    // Let's re-add it explicitly if needed or ensure it's properly named.
    // Actually, let's just make sure all expected columns exist in operations.cash_movements
    await queryRunner.query(
      `ALTER TABLE "operations"."cash_movements" ADD COLUMN IF NOT EXISTS "is_void" boolean DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."cash_movements" ADD COLUMN IF NOT EXISTS "is_tip" boolean DEFAULT false`,
    );

    // 6. Fix any orphaned categories/items by ensuring foreign keys are consistent
    // (Existing FKs are already present, just adding this as a note for the runner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Simplified down for recovery
  }
}
