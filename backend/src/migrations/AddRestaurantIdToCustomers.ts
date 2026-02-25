/**
 * =============================================================================
 * !!! WARNING: DATA LOSS RISK FOR MULTI-BRANCH SETUPS !!!
 * =============================================================================
 * 
 * This migration assigns ALL existing customers to the FIRST restaurant found
 * in the database. This is a DESTRUCTIVE operation for multi-branch systems.
 * 
 * BEFORE RUNNING THIS MIGRATION IN PRODUCTION:
 * 1. Back up your customer data
 * 2. Verify which customers belong to which branches
 * 3. Consider running a manual migration script instead
 * 4. After running, verify customer associations are correct
 * 
 * In multi-branch setups, customers will need to be re-associated to their
 * correct branches after running this migration.
 * 
 * =============================================================================
 */
/**
 * =============================================================================
 * !!! WARNING: DATA LOSS RISK FOR MULTI-BRANCH SETUPS !!!
 * =============================================================================
 * 
 * This migration assigns ALL existing customers to the FIRST restaurant found
 * in the database. This is a DESTRUCTIVE operation for multi-branch systems.
 * 
 * BEFORE RUNNING THIS MIGRATION IN PRODUCTION:
 * 1. Back up your customer data
 * 2. Verify which customers belong to which branches
 * 3. Consider running a manual migration script instead
 * 4. After running, verify customer associations are correct
 * 
 * In multi-branch setups, customers will need to be re-associated to their
 * correct branches after running this migration.
 * 
 * =============================================================================
 */
import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddRestaurantIdToCustomers1770991000000 implements MigrationInterface {
  name = 'AddRestaurantIdToCustomers1770991000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const columns = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name = 'restaurant_id'
    `);
    
    if (columns.length === 0) {
      // Get a restaurant ID to use as default
      // IMPORTANT: This migration requires at least one restaurant to exist in the database.
      // It will fail with a clear error if no restaurants are found.
      // In multi-branch setups, ensure this migration is run after initial restaurant seeding.
      const restaurants = await queryRunner.query(`SELECT id FROM business.restaurants LIMIT 1`);
      
      // CRITICAL: This migration assigns ALL existing customers to the FIRST restaurant found.
      // In multi-branch setups, this may cause data association issues.
      // Consider running this migration per-restaurant or using a data migration script instead.
      // 
      // WARNING: This is a one-time migration - customers will need to be re-associated
      // to their correct branches after running if this is a multi-branch system.
      if (!restaurants || restaurants.length === 0) {
        // Fail with clear error - need at least one restaurant for multi-tenant
        throw new Error(
          'CRITICAL: No restaurants found in database. Please seed restaurants before running this migration. ' +
          'Multi-tenant customers require a restaurant to be associated with.'
        );
      }
      
      const defaultRestaurantId = restaurants[0].id;
      
      // Step 1: Add column as nullable first (avoids table rewrite and allows existing rows)
      await queryRunner.query(`
        ALTER TABLE "business"."customers" 
        ADD COLUMN "restaurant_id" UUID NULL
      `);
      
      // Step 2: Update existing rows with default restaurant (batch update to avoid locks)
      await queryRunner.query(
        `UPDATE "business"."customers" SET "restaurant_id" = $1 WHERE "restaurant_id" IS NULL`,
        [defaultRestaurantId]
      );
      
      // Step 3: Verify all rows have a value
      const nullCount = await queryRunner.query(`
        SELECT COUNT(*) as count FROM "business"."customers" 
        WHERE "restaurant_id" IS NULL
      `);
      
      if (parseInt(nullCount[0].count) > 0) {
        throw new Error('Failed to backfill restaurant_id for all customers');
      }
      
      // Step 4: Alter to NOT NULL now that all rows have values
      await queryRunner.query(`
        ALTER TABLE "business"."customers" 
        ALTER COLUMN "restaurant_id" SET NOT NULL
      `);
    }
    
    // Create index for performance
    try {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_customers_restaurant 
        ON business.customers(restaurant_id)
      `);
    } catch (e) {
      // Index might already exist
    }
    
    // Handle unique constraint: drop existing unique on phone, create composite on (phone, restaurant_id)
    try {
      // Drop existing unique constraint on phone if it exists
      await queryRunner.query(`
        ALTER TABLE "business"."customers" DROP CONSTRAINT IF EXISTS "UQ_customers_phone"
      `);
    } catch (e) {
      // Constraint might not exist
    }
    
    // Create composite unique constraint for multi-tenant uniqueness
    try {
      await queryRunner.query(`
        ALTER TABLE "business"."customers" 
        ADD CONSTRAINT "UQ_customers_phone_restaurant" UNIQUE ("phone", "restaurant_id")
      `);
    } catch (e) {
      // Constraint might already exist
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop composite unique constraint
    await queryRunner.query(`ALTER TABLE "business"."customers" DROP CONSTRAINT IF EXISTS "UQ_customers_phone_restaurant"`);
    
    // Recreate original unique constraint on phone
    try {
      await queryRunner.query(`ALTER TABLE "business"."customers" ADD CONSTRAINT "UQ_customers_phone" UNIQUE ("phone")`);
    } catch (e) {
      // May fail if there are duplicate phone numbers
    }
    
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customers_restaurant`);
    await queryRunner.query(`ALTER TABLE "business"."customers" DROP COLUMN IF EXISTS "restaurant_id"`);
  }
}
