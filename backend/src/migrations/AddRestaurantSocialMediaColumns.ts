import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRestaurantSocialMediaColumns1700000000000 implements MigrationInterface {
    name = 'AddRestaurantSocialMediaColumns1700000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Sadece sosyal medya kolonlarını ekle - nullable oldukları için mevcut veriler etkilenmez
        await queryRunner.query(`
            ALTER TABLE "business"."restaurants" 
            ADD COLUMN IF NOT EXISTS "instagram_url" character varying
        `);

        await queryRunner.query(`
            ALTER TABLE "business"."restaurants" 
            ADD COLUMN IF NOT EXISTS "facebook_url" character varying
        `);

        await queryRunner.query(`
            ALTER TABLE "business"."restaurants" 
            ADD COLUMN IF NOT EXISTS "twitter_url" character varying
        `);

        await queryRunner.query(`
            ALTER TABLE "business"."restaurants" 
            ADD COLUMN IF NOT EXISTS "website_url" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback - kolonları sil
        await queryRunner.query(`
            ALTER TABLE "business"."restaurants" 
            DROP COLUMN IF EXISTS "instagram_url"
        `);

        await queryRunner.query(`
            ALTER TABLE "business"."restaurants" 
            DROP COLUMN IF EXISTS "facebook_url"
        `);

        await queryRunner.query(`
            ALTER TABLE "business"."restaurants" 
            DROP COLUMN IF EXISTS "twitter_url"
        `);

        await queryRunner.query(`
            ALTER TABLE "business"."restaurants" 
            DROP COLUMN IF EXISTS "website_url"
        `);
    }
}
