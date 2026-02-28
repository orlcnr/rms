import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTipFeatureSchema1772208076878 implements MigrationInterface {
  name = 'AddTipFeatureSchema1772208076878';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create restaurant_settings table
    await queryRunner.query(
      `CREATE TYPE "public"."restaurant_settings_type_enum" AS ENUM('number', 'boolean', 'string')`,
    );
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "restaurant_settings" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "restaurant_id" uuid NOT NULL, 
            "key" character varying(255) NOT NULL, 
            "value" text NOT NULL, 
            "type" "public"."restaurant_settings_type_enum" NOT NULL DEFAULT 'string', 
            "group" character varying(100) NOT NULL DEFAULT 'general', 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
            CONSTRAINT "UQ_restaurant_settings_key" UNIQUE ("restaurant_id", "key"), 
            CONSTRAINT "PK_restaurant_settings" PRIMARY KEY ("id")
        )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_restaurant_settings_restaurant_group" ON "restaurant_settings" ("restaurant_id", "group")`,
    );

    // Add tip columns to payments
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" ADD COLUMN IF NOT EXISTS "tip_amount" decimal(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" ADD COLUMN IF NOT EXISTS "commission_rate" decimal(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" ADD COLUMN IF NOT EXISTS "net_tip_amount" decimal(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" DROP COLUMN IF EXISTS "net_tip_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" DROP COLUMN IF EXISTS "commission_rate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations"."payments" DROP COLUMN IF EXISTS "tip_amount"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurant_settings"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."restaurant_settings_type_enum"`,
    );
  }
}
