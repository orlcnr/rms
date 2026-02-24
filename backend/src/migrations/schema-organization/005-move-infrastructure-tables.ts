import { MigrationInterface, QueryRunner } from 'typeorm'

export class MoveInfrastructureTables1738589404000 implements MigrationInterface {
    name = 'MoveInfrastructureTables1738589404000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Move infrastructure tables
        const infrastructureTables = [
            'notifications',
        ]

        for (const table of infrastructureTables) {
            await queryRunner.query(`ALTER TABLE public.${table} SET SCHEMA infrastructure`)
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const infrastructureTables = [
            'notifications',
        ]

        for (const table of infrastructureTables) {
            await queryRunner.query(`ALTER TABLE infrastructure.${table} SET SCHEMA public`)
        }
    }
}
