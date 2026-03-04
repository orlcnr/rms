import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncPaymentMethodEnumsForCashMovements1772417000000 implements MigrationInterface {
  name = 'SyncPaymentMethodEnumsForCashMovements1772417000000';

  private readonly paymentMethods = [
    'cash',
    'credit_card',
    'debit_card',
    'digital_wallet',
    'bank_transfer',
    'open_account',
    'meal_voucher',
  ];

  private readonly enumTargets = [
    { schema: 'operations', name: 'cash_movements_payment_method_enum' },
    { schema: 'public', name: 'cash_movements_payment_method_enum' },
    { schema: 'operations', name: 'payments_payment_method_enum' },
    { schema: 'public', name: 'payments_payment_method_enum' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const target of this.enumTargets) {
      const exists = await queryRunner.query(
        `
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = $1
            AND t.typname = $2
          LIMIT 1
        `,
        [target.schema, target.name],
      );

      if (!Array.isArray(exists) || exists.length === 0) {
        continue;
      }

      for (const method of this.paymentMethods) {
        await queryRunner.query(
          `ALTER TYPE "${target.schema}"."${target.name}" ADD VALUE IF NOT EXISTS '${method}'`,
        );
      }
    }
  }

  public async down(): Promise<void> {
    // Enum değerlerini güvenli şekilde geri almak mümkün değildir.
  }
}
