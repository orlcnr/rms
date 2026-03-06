import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillCategoryAndMenuItemBrandScope1772801000000 implements MigrationInterface {
  name = 'BackfillCategoryAndMenuItemBrandScope1772801000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE business.categories c
      SET brand_id = r.brand_id
      FROM business.restaurants r
      WHERE c.restaurant_id = r.id
        AND c.brand_id IS NULL
        AND r.brand_id IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE business.menu_items mi
      SET brand_id = r.brand_id
      FROM business.restaurants r
      WHERE mi.restaurant_id = r.id
        AND mi.brand_id IS NULL
        AND r.brand_id IS NOT NULL
    `);
  }

  public async down(): Promise<void> {
    // Data backfill migration is intentionally non-reversible.
  }
}
