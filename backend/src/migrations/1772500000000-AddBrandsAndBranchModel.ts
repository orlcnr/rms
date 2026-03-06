import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrandsAndBranchModel1772500000000 implements MigrationInterface {
  name = 'AddBrandsAndBranchModel1772500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "business"."brands" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "name" character varying NOT NULL,
        "owner_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_brands_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."restaurants"
      ADD COLUMN IF NOT EXISTS "brand_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."restaurants"
      ADD COLUMN IF NOT EXISTS "is_branch" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."categories"
      ADD COLUMN IF NOT EXISTS "brand_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."menu_items"
      ADD COLUMN IF NOT EXISTS "brand_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."menu_items"
      ADD COLUMN IF NOT EXISTS "branch_id" uuid
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "business"."branch_menu_overrides" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "branch_id" uuid NOT NULL,
        "menu_item_id" uuid NOT NULL,
        "action" character varying NOT NULL,
        "custom_price" numeric(10,2),
        CONSTRAINT "CHK_branch_menu_overrides_action" CHECK ("action" IN ('hide')),
        CONSTRAINT "PK_branch_menu_overrides_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_menu_overrides_branch_item" UNIQUE ("branch_id", "menu_item_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "business"."user_branch_roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" uuid NOT NULL,
        "brand_id" uuid NOT NULL,
        "branch_id" uuid,
        "role" character varying NOT NULL,
        CONSTRAINT "PK_user_branch_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_branch_roles_scope" UNIQUE ("user_id", "brand_id", "branch_id", "role")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_menu_items_brand_branch"
      ON "business"."menu_items" ("brand_id", "branch_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_overrides_branch_item"
      ON "business"."branch_menu_overrides" ("branch_id", "menu_item_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_menu_items_branch"
      ON "business"."menu_items" ("branch_id")
      WHERE "branch_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_branch_roles_user"
      ON "business"."user_branch_roles" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_branch_roles_scope_lookup"
      ON "business"."user_branch_roles" ("brand_id", "branch_id", "role")
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        restaurant_record RECORD;
        selected_owner uuid;
        new_brand_id uuid;
      BEGIN
        FOR restaurant_record IN
          SELECT r.id, r.name, r.owner_id
          FROM business.restaurants r
          WHERE r.brand_id IS NULL
        LOOP
          selected_owner := restaurant_record.owner_id;

          IF selected_owner IS NULL THEN
            SELECT u.id
            INTO selected_owner
            FROM business.users u
            WHERE u.restaurant_id = restaurant_record.id
              AND u.is_active = true
              AND u.role = 'restaurant_owner'
            ORDER BY u.created_at ASC
            LIMIT 1;
          END IF;

          IF selected_owner IS NULL THEN
            SELECT u.id
            INTO selected_owner
            FROM business.users u
            WHERE u.restaurant_id = restaurant_record.id
              AND u.is_active = true
              AND u.role = 'manager'
            ORDER BY u.created_at ASC
            LIMIT 1;
          END IF;

          IF selected_owner IS NULL THEN
            RAISE EXCEPTION 'Brand owner bulunamadi. Restaurant id: %', restaurant_record.id;
          END IF;

          INSERT INTO business.brands (name, owner_id, is_active)
          VALUES (restaurant_record.name, selected_owner, true)
          RETURNING id INTO new_brand_id;

          UPDATE business.restaurants
          SET brand_id = new_brand_id,
              is_branch = true
          WHERE id = restaurant_record.id;
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      UPDATE business.categories c
      SET brand_id = r.brand_id
      FROM business.restaurants r
      WHERE c.restaurant_id = r.id
        AND c.brand_id IS NULL
    `);

    await queryRunner.query(`
      UPDATE business.menu_items mi
      SET brand_id = r.brand_id
      FROM business.restaurants r
      WHERE mi.restaurant_id = r.id
        AND mi.brand_id IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO business.user_branch_roles (user_id, brand_id, branch_id, role)
      SELECT
        u.id,
        r.brand_id,
        u.restaurant_id,
        u.role::text
      FROM business.users u
      JOIN business.restaurants r ON r.id = u.restaurant_id
      WHERE u.restaurant_id IS NOT NULL
      ON CONFLICT ON CONSTRAINT "UQ_user_branch_roles_scope" DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE business.brands b
      SET owner_id = u.user_id
      FROM (
        SELECT ubr.brand_id, ubr.user_id
        FROM business.user_branch_roles ubr
        WHERE ubr.role = 'restaurant_owner'
      ) u
      WHERE b.id = u.brand_id
        AND b.owner_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."brands"
      ALTER COLUMN "owner_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."restaurants"
      ALTER COLUMN "brand_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."brands"
      ADD CONSTRAINT "FK_brands_owner" FOREIGN KEY ("owner_id") REFERENCES "business"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."restaurants"
      ADD CONSTRAINT "FK_restaurants_brand" FOREIGN KEY ("brand_id") REFERENCES "business"."brands"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."categories"
      ADD CONSTRAINT "FK_categories_brand" FOREIGN KEY ("brand_id") REFERENCES "business"."brands"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."menu_items"
      ADD CONSTRAINT "FK_menu_items_brand" FOREIGN KEY ("brand_id") REFERENCES "business"."brands"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."menu_items"
      ADD CONSTRAINT "FK_menu_items_branch" FOREIGN KEY ("branch_id") REFERENCES "business"."restaurants"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."branch_menu_overrides"
      ADD CONSTRAINT "FK_branch_menu_overrides_branch" FOREIGN KEY ("branch_id") REFERENCES "business"."restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."branch_menu_overrides"
      ADD CONSTRAINT "FK_branch_menu_overrides_menu_item" FOREIGN KEY ("menu_item_id") REFERENCES "business"."menu_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."user_branch_roles"
      ADD CONSTRAINT "FK_user_branch_roles_user" FOREIGN KEY ("user_id") REFERENCES "business"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."user_branch_roles"
      ADD CONSTRAINT "FK_user_branch_roles_brand" FOREIGN KEY ("brand_id") REFERENCES "business"."brands"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "business"."user_branch_roles"
      ADD CONSTRAINT "FK_user_branch_roles_branch" FOREIGN KEY ("branch_id") REFERENCES "business"."restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business"."user_branch_roles" DROP CONSTRAINT IF EXISTS "FK_user_branch_roles_branch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."user_branch_roles" DROP CONSTRAINT IF EXISTS "FK_user_branch_roles_brand"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."user_branch_roles" DROP CONSTRAINT IF EXISTS "FK_user_branch_roles_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."branch_menu_overrides" DROP CONSTRAINT IF EXISTS "FK_branch_menu_overrides_menu_item"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."branch_menu_overrides" DROP CONSTRAINT IF EXISTS "FK_branch_menu_overrides_branch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."menu_items" DROP CONSTRAINT IF EXISTS "FK_menu_items_branch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."menu_items" DROP CONSTRAINT IF EXISTS "FK_menu_items_brand"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."categories" DROP CONSTRAINT IF EXISTS "FK_categories_brand"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."restaurants" DROP CONSTRAINT IF EXISTS "FK_restaurants_brand"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."brands" DROP CONSTRAINT IF EXISTS "FK_brands_owner"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "business"."idx_user_branch_roles_scope_lookup"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "business"."idx_user_branch_roles_user"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "business"."idx_menu_items_branch"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "business"."idx_overrides_branch_item"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "business"."idx_menu_items_brand_branch"`,
    );

    await queryRunner.query(
      `DROP TABLE IF EXISTS "business"."user_branch_roles"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "business"."branch_menu_overrides"`,
    );

    await queryRunner.query(
      `ALTER TABLE "business"."menu_items" DROP COLUMN IF EXISTS "branch_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."menu_items" DROP COLUMN IF EXISTS "brand_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."categories" DROP COLUMN IF EXISTS "brand_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."restaurants" DROP COLUMN IF EXISTS "is_branch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business"."restaurants" DROP COLUMN IF EXISTS "brand_id"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "business"."brands"`);
  }
}
