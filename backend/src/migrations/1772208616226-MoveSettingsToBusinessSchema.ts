import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveSettingsToBusinessSchema1772208616226 implements MigrationInterface {
  name = 'MoveSettingsToBusinessSchema1772208616226';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure business schema exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "business"`);

    // Move table from public to business
    await queryRunner.query(
      `ALTER TABLE "restaurant_settings" SET SCHEMA "business"`,
    );

    // Move type enum if it exists in public
    // First check if it exists in public
    const enumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type t 
            JOIN pg_namespace n ON n.oid = t.typnamespace 
            WHERE t.typname = 'restaurant_settings_type_enum' AND n.nspname = 'public'
        `);

    if (enumExists.length > 0) {
      await queryRunner.query(
        `ALTER TYPE "public"."restaurant_settings_type_enum" SET SCHEMA "business"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Move table back to public
    await queryRunner.query(
      `ALTER TABLE "business"."restaurant_settings" SET SCHEMA "public"`,
    );

    // Move type enum back to public
    const enumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type t 
            JOIN pg_namespace n ON n.oid = t.typnamespace 
            WHERE t.typname = 'restaurant_settings_type_enum' AND n.nspname = 'business'
        `);

    if (enumExists.length > 0) {
      await queryRunner.query(
        `ALTER TYPE "business"."restaurant_settings_type_enum" SET SCHEMA "public"`,
      );
    }
  }
}
