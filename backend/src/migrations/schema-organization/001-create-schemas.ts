import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchemas1738589400000 implements MigrationInterface {
  name = 'CreateSchemas1738589400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schemas
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS business`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS operations`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS public_api`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS infrastructure`);

    // Grant permissions to postgres user
    await queryRunner.query(`GRANT USAGE ON SCHEMA business TO postgres`);
    await queryRunner.query(`GRANT USAGE ON SCHEMA operations TO postgres`);
    await queryRunner.query(`GRANT USAGE ON SCHEMA public_api TO postgres`);
    await queryRunner.query(`GRANT USAGE ON SCHEMA infrastructure TO postgres`);

    await queryRunner.query(
      `GRANT ALL ON ALL TABLES IN SCHEMA business TO postgres`,
    );
    await queryRunner.query(
      `GRANT ALL ON ALL TABLES IN SCHEMA operations TO postgres`,
    );
    await queryRunner.query(
      `GRANT ALL ON ALL TABLES IN SCHEMA public_api TO postgres`,
    );
    await queryRunner.query(
      `GRANT ALL ON ALL TABLES IN SCHEMA infrastructure TO postgres`,
    );

    // Grant permissions on future tables
    await queryRunner.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA business GRANT ALL ON TABLES TO postgres`,
    );
    await queryRunner.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA operations GRANT ALL ON TABLES TO postgres`,
    );
    await queryRunner.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public_api GRANT ALL ON TABLES TO postgres`,
    );
    await queryRunner.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA infrastructure GRANT ALL ON TABLES TO postgres`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS infrastructure CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS public_api CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS operations CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS business CASCADE`);
  }
}
