import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveOperationsTables1738589402000 implements MigrationInterface {
  name = 'MoveOperationsTables1738589402000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Move inventory tables
    const inventoryTables = [
      'ingredients',
      'stocks',
      'stock_movements',
      'recipes',
    ];

    for (const table of inventoryTables) {
      await queryRunner.query(
        `ALTER TABLE public.${table} SET SCHEMA operations`,
      );
    }

    // Move finance tables
    const financeTables = [
      'payments',
      'cash_registers',
      'cash_sessions',
      'cash_movements',
    ];

    for (const table of financeTables) {
      await queryRunner.query(
        `ALTER TABLE public.${table} SET SCHEMA operations`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const operationsTables = [
      'ingredients',
      'stocks',
      'stock_movements',
      'recipes',
      'payments',
      'cash_registers',
      'cash_sessions',
      'cash_movements',
    ];

    for (const table of operationsTables) {
      await queryRunner.query(
        `ALTER TABLE operations.${table} SET SCHEMA public`,
      );
    }
  }
}
