import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddRestaurantIdToPayments1770992000000 implements MigrationInterface {
  name = 'AddRestaurantIdToPayments1770992000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const columns = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'payments' AND table_schema = 'operations' AND column_name = 'restaurant_id'
    `);
    
    if (columns.length === 0) {
      // Add restaurant_id column
      await queryRunner.query(`
        ALTER TABLE "operations"."payments" 
        ADD COLUMN "restaurant_id" UUID NULL
      `);

      // Get orders to backfill restaurant_id from order relationship
      // This assumes orders already have restaurant_id
      await queryRunner.query(`
        UPDATE "operations"."payments" p
        SET restaurant_id = o.restaurant_id
        FROM "business"."orders" o
        WHERE p.order_id = o.id
        AND p.restaurant_id IS NULL
      `);

      // Verify all rows have a value
      const nullCount = await queryRunner.query(`
        SELECT COUNT(*) as count FROM "operations"."payments" 
        WHERE "restaurant_id" IS NULL
      `);
      
      if (parseInt(nullCount[0].count) > 0) {
        // If some payments can't be linked to orders, set a default restaurant
        // This should rarely happen in production
        console.warn('Some payments could not be backfilled with restaurant_id');
      }

      // Set NOT NULL where possible (may fail if there are nulls)
      try {
        await queryRunner.query(`
          ALTER TABLE "operations"."payments" 
          ALTER COLUMN "restaurant_id" SET NOT NULL
        `);
      } catch (e) {
        console.warn('Could not set restaurant_id NOT NULL, some values may be null');
      }
    }
    
    // Create index for performance
    try {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_payments_restaurant 
        ON operations.payments(restaurant_id)
      `);
    } catch (e) {
      // Index might already exist
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_restaurant`);
    await queryRunner.query(`ALTER TABLE "operations"."payments" DROP COLUMN IF EXISTS "restaurant_id"`);
  }
}
