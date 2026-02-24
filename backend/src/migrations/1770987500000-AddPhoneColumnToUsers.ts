import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhoneColumnToUsers1770987500000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column exists first
        const hasColumn = await queryRunner.hasColumn("business.users", "phone");
        if (!hasColumn) {
            await queryRunner.query(`ALTER TABLE "business"."users" ADD "phone" character varying`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business"."users" DROP COLUMN "phone"`);
    }
}
