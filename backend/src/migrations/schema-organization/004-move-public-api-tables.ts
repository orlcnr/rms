import { MigrationInterface, QueryRunner } from 'typeorm'

export class MovePublicApiTables1738589403000 implements MigrationInterface {
    name = 'MovePublicApiTables1738589403000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Move guest-facing tables
        const publicApiTables = [
            'guest_orders',
            'guest_order_events',
        ]

        for (const table of publicApiTables) {
            await queryRunner.query(`ALTER TABLE public.${table} SET SCHEMA public_api`)
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const publicApiTables = [
            'guest_orders',
            'guest_order_events',
        ]

        for (const table of publicApiTables) {
            await queryRunner.query(`ALTER TABLE public_api.${table} SET SCHEMA public`)
        }
    }
}
