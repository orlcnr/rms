import { MigrationInterface, QueryRunner } from 'typeorm';

async function ensureEnumValue(
  queryRunner: QueryRunner,
  schema: string,
  enumName: string,
  value: string,
): Promise<void> {
  await queryRunner.query(
    `
    DO $$
    DECLARE
      enum_exists boolean;
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

      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = '${schema}'
          AND t.typname = '${enumName}'
          AND e.enumlabel = '${value}'
      ) THEN
        EXECUTE format(
          'ALTER TYPE %I.%I ADD VALUE %L',
          '${schema}',
          '${enumName}',
          '${value}'
        );
      END IF;
    END$$;
    `,
  );
}

export class AddArrivedToReservationStatusEnum1773600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await ensureEnumValue(
      queryRunner,
      'business',
      'reservations_status_enum',
      'arrived',
    );
    await ensureEnumValue(
      queryRunner,
      'public',
      'reservations_status_enum',
      'arrived',
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL enum value removal is unsafe and intentionally skipped.
  }
}

