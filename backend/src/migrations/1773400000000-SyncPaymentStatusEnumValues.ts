import { MigrationInterface, QueryRunner } from 'typeorm';

const REQUIRED_PAYMENT_STATUSES = [
  'completed',
  'failed',
  'pending',
  'refunded',
  'cancelled',
];

async function ensureEnumValues(
  queryRunner: QueryRunner,
  schema: string,
  enumName: string,
  values: string[],
): Promise<void> {
  await queryRunner.query(
    `
    DO $$
    DECLARE
      enum_exists boolean;
      v text;
    BEGIN
      SELECT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = '${schema}' AND t.typname = '${enumName}'
      ) INTO enum_exists;

      IF NOT enum_exists THEN
        RETURN;
      END IF;

      FOREACH v IN ARRAY ARRAY[${values.map((value) => `'${value}'`).join(', ')}]
      LOOP
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = '${schema}'
            AND t.typname = '${enumName}'
            AND e.enumlabel = v
        ) THEN
          EXECUTE format(
            'ALTER TYPE %I.%I ADD VALUE %L',
            '${schema}',
            '${enumName}',
            v
          );
        END IF;
      END LOOP;
    END$$;
    `,
  );
}

export class SyncPaymentStatusEnumValues1773400000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await ensureEnumValues(
      queryRunner,
      'public',
      'payments_status_enum',
      REQUIRED_PAYMENT_STATUSES,
    );
    await ensureEnumValues(
      queryRunner,
      'operations',
      'payments_status_enum',
      REQUIRED_PAYMENT_STATUSES,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL enum value removal is non-trivial and unsafe for rollback.
    // Intentionally left empty.
  }
}

