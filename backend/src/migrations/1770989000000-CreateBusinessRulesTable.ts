import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBusinessRulesTable1770989000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Category Enum
    await queryRunner.query(
      `CREATE TYPE "business"."business_rules_category_enum" AS ENUM('CASH', 'ORDER', 'INVENTORY', 'SYSTEM')`,
    );

    // Create Table
    await queryRunner.query(`
            CREATE TABLE "business"."business_rules" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "deleted_at" TIMESTAMP WITH TIME ZONE, 
                "restaurant_id" character varying NOT NULL, 
                "category" "business"."business_rules_category_enum" NOT NULL, 
                "key" character varying NOT NULL, 
                "name" character varying NOT NULL, 
                "description" text, 
                "is_enabled" boolean NOT NULL DEFAULT true, 
                "config" jsonb, 
                CONSTRAINT "PK_business_rules" PRIMARY KEY ("id")
            )
        `);

    // Index
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_business_rules_restaurant_key" ON "business"."business_rules" ("restaurant_id", "key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "business"."IDX_business_rules_restaurant_key"`,
    );
    await queryRunner.query(`DROP TABLE "business"."business_rules"`);
    await queryRunner.query(
      `DROP TYPE "business"."business_rules_category_enum"`,
    );
  }
}
