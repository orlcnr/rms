import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveToRestaurants1706968000000 implements MigrationInterface {
    name = 'AddIsActiveToRestaurants1706968000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business"."restaurants" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business"."restaurants" DROP COLUMN "is_active"`);
    }
}
