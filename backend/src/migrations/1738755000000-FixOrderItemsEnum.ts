import { MigrationInterface, QueryRunner } from "typeorm";

export class FixOrderItemsEnum1738755000000 implements MigrationInterface {
    name = 'FixOrderItemsEnum1738755000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add missing values to order_items_status_enum
        await queryRunner.query(`ALTER TYPE "public"."order_items_status_enum" ADD VALUE IF NOT EXISTS 'on_way'`);
        await queryRunner.query(`ALTER TYPE "public"."order_items_status_enum" ADD VALUE IF NOT EXISTS 'delivered'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Enums cannot be easily reverted in Postgres (cannot remove values)
    }
}
