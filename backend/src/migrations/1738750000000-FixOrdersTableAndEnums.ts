import { MigrationInterface, QueryRunner } from "typeorm";

export class FixOrdersTableAndEnums1738750000000 implements MigrationInterface {
    name = 'FixOrdersTableAndEnums1738750000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. OrderStatus enum güncellemesi (on_way ve delivered eksik)
        // Not: Mevcut enum public şemasında olabilir, bu yüzden şemasız veya public ile deniyoruz
        await queryRunner.query(`ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'on_way'`);
        await queryRunner.query(`ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'delivered'`);

        // 2. Yeni Enumlar oluşturulması
        await queryRunner.query(`CREATE TYPE "business"."orders_type_enum" AS ENUM('dine_in', 'takeaway', 'delivery')`);
        await queryRunner.query(`CREATE TYPE "business"."orders_source_enum" AS ENUM('internal', 'yemek_sepeti', 'getir', 'trendyol', 'migros_yemek')`);

        // 3. Eksik kolonların eklenmesi
        await queryRunner.query(`ALTER TABLE "business"."orders" ADD "customer_id" uuid`);
        await queryRunner.query(`ALTER TABLE "business"."orders" ADD "type" "business"."orders_type_enum" NOT NULL DEFAULT 'dine_in'`);
        await queryRunner.query(`ALTER TABLE "business"."orders" ADD "source" "business"."orders_source_enum" NOT NULL DEFAULT 'internal'`);
        await queryRunner.query(`ALTER TABLE "business"."orders" ADD "external_id" text`);
        await queryRunner.query(`ALTER TABLE "business"."orders" ADD "address" text`);
        await queryRunner.query(`ALTER TABLE "business"."orders" ADD "delivery_fee" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "business"."orders" ADD "integration_metadata" jsonb`);

        // 4. Foreign Key (Customer)
        await queryRunner.query(`ALTER TABLE "business"."orders" ADD CONSTRAINT "FK_orders_customer" FOREIGN KEY ("customer_id") REFERENCES "business"."customers"("id") ON DELETE SET NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business"."orders" DROP CONSTRAINT "FK_orders_customer"`);
        await queryRunner.query(`ALTER TABLE "business"."orders" DROP COLUMN "integration_metadata"`);
        await queryRunner.query(`ALTER TABLE "business"."orders" DROP COLUMN "delivery_fee"`);
        await queryRunner.query(`ALTER TABLE "business"."orders" DROP COLUMN "address"`);
        await queryRunner.query(`ALTER TABLE "business"."orders" DROP COLUMN "external_id"`);
        await queryRunner.query(`ALTER TABLE "business"."orders" DROP COLUMN "source"`);
        await queryRunner.query(`ALTER TABLE "business"."orders" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "business"."orders" DROP COLUMN "customer_id"`);

        await queryRunner.query(`DROP TYPE "business"."orders_source_enum"`);
        await queryRunner.query(`DROP TYPE "business"."orders_type_enum"`);

        // Note: PostgreSQL enum values cannot be easily removed via ALTER TYPE DROP VALUE
        // It's usually better to leave them or recreate the type if needed, but not recommended for production.
    }
}
