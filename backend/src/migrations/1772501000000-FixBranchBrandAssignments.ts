import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBranchBrandAssignments1772501000000 implements MigrationInterface {
  name = 'FixBranchBrandAssignments1772501000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS tmp_branch_brand_fix_candidates
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE tmp_branch_brand_fix_candidates AS
      SELECT
        branch.id AS branch_id,
        branch.brand_id AS current_brand_id,
        home_branch.brand_id AS target_brand_id
      FROM business.restaurants branch
      INNER JOIN business.users owner_user ON owner_user.id = branch.owner_id
      INNER JOIN business.restaurants home_branch
        ON home_branch.id = owner_user.restaurant_id
      INNER JOIN business.brands branch_brand
        ON branch_brand.id = branch.brand_id
      WHERE branch.is_branch = true
        AND home_branch.brand_id IS NOT NULL
        AND branch.brand_id IS DISTINCT FROM home_branch.brand_id
        AND branch_brand.owner_id = branch.owner_id
        AND branch_brand.name = branch.name
        AND (
          SELECT COUNT(*)
          FROM business.restaurants sibling
          WHERE sibling.brand_id = branch.brand_id
        ) = 1
    `);

    await queryRunner.query(`
      UPDATE business.restaurants branch
      SET brand_id = candidate.target_brand_id
      FROM tmp_branch_brand_fix_candidates candidate
      WHERE candidate.branch_id = branch.id
    `);

    await queryRunner.query(`
      UPDATE business.categories category
      SET brand_id = candidate.target_brand_id
      FROM tmp_branch_brand_fix_candidates candidate
      WHERE category.restaurant_id = candidate.branch_id
        AND category.brand_id IS DISTINCT FROM candidate.target_brand_id
    `);

    await queryRunner.query(`
      UPDATE business.menu_items item
      SET brand_id = candidate.target_brand_id
      FROM tmp_branch_brand_fix_candidates candidate
      WHERE item.restaurant_id = candidate.branch_id
        AND item.brand_id IS DISTINCT FROM candidate.target_brand_id
    `);

    await queryRunner.query(`
      UPDATE business.user_branch_roles ubr
      SET brand_id = candidate.target_brand_id
      FROM tmp_branch_brand_fix_candidates candidate
      WHERE ubr.branch_id = candidate.branch_id
        AND ubr.brand_id IS DISTINCT FROM candidate.target_brand_id
    `);
  }

  public async down(): Promise<void> {
    // One-way data fix migration: cannot safely restore previous incorrect brand links.
  }
}
