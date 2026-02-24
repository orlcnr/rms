import { MigrationInterface, QueryRunner } from 'typeorm'

export class MoveBusinessTables1738589401000 implements MigrationInterface {
    name = 'MoveBusinessTables1738589401000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Move tables to business schema
        const businessTables = [
            'users',
            'restaurants',
            'customers',
            'orders',
            'order_items',
            'tables',
            'areas',
            'menu_items',
            'categories',
            'reservations',
        ]

        for (const table of businessTables) {
            await queryRunner.query(`ALTER TABLE public.${table} SET SCHEMA business`)
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const businessTables = [
            'users',
            'restaurants',
            'customers',
            'orders',
            'order_items',
            'tables',
            'areas',
            'menu_items',
            'categories',
            'reservations',
        ]

        for (const table of businessTables) {
            await queryRunner.query(`ALTER TABLE business.${table} SET SCHEMA public`)
        }
    }
}
