import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerDebtFields1739999999999 implements MigrationInterface {
  name = 'AddCustomerDebtFields1739999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add debt-related columns to customers table (business schema)
    await queryRunner.query(`
      ALTER TABLE "business"."customers" 
      ADD COLUMN IF NOT EXISTS "total_debt" DECIMAL(10,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."customers" 
      ADD COLUMN IF NOT EXISTS "current_debt" DECIMAL(10,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."customers" 
      ADD COLUMN IF NOT EXISTS "credit_limit" DECIMAL(10,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."customers" 
      ADD COLUMN IF NOT EXISTS "credit_limit_enabled" BOOLEAN NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."customers" 
      ADD COLUMN IF NOT EXISTS "max_open_orders" INTEGER NOT NULL DEFAULT 5
    `);

    // Add customer_id to payments table for open account tracking (operations schema)
    await queryRunner.query(`
      ALTER TABLE "operations"."payments" 
      ADD COLUMN IF NOT EXISTS "customer_id" UUID
    `);

    await queryRunner.query(`
      ALTER TABLE "operations"."payments" 
      ADD COLUMN IF NOT EXISTS "cash_received" DECIMAL(10,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "operations"."payments" 
      ADD COLUMN IF NOT EXISTS "change_given" DECIMAL(10,2)
    `);

    // Add discount_type and discount_reason columns
    await queryRunner.query(`
      ALTER TABLE "operations"."payments" 
      ADD COLUMN IF NOT EXISTS "discount_type" VARCHAR(50)
    `);

    await queryRunner.query(`
      ALTER TABLE "operations"."payments" 
      ADD COLUMN IF NOT EXISTS "discount_reason" TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE "operations"."payments" 
      ADD COLUMN IF NOT EXISTS "original_payment_id" UUID
    `);

    // Add indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_customer_id" 
      ON "operations"."payments" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_customers_current_debt" 
      ON "business"."customers" ("current_debt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_customers_current_debt"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_customer_id"`);

    await queryRunner.query(
      `ALTER TABLE "operations"."payments" DROP COLUMN IF EXISTS "original_payment_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" DROP COLUMN IF EXISTS "discount_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" DROP COLUMN IF EXISTS "discount_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" DROP COLUMN IF EXISTS "change_given"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" DROP COLUMN IF EXISTS "cash_received"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" DROP COLUMN IF EXISTS "customer_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "business"."customers" DROP COLUMN IF EXISTS "max_open_orders"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."customers" DROP COLUMN IF EXISTS "credit_limit_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."customers" DROP COLUMN IF EXISTS "credit_limit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."customers" DROP COLUMN IF EXISTS "current_debt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."customers" DROP COLUMN IF EXISTS "total_debt"`,
    );
  }
}
