import { MigrationInterface, QueryRunner } from 'typeorm';

async function ensureEnumValue(
  queryRunner: QueryRunner,
  schema: string,
  enumName: string,
  value: string,
): Promise<void> {
  await queryRunner.query(`
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
  `);
}

async function renameEnumValueIfExists(
  queryRunner: QueryRunner,
  schema: string,
  enumName: string,
  fromValue: string,
  toValue: string,
): Promise<void> {
  await queryRunner.query(`
    DO $$
    DECLARE
      has_from boolean;
      has_to boolean;
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

      SELECT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = '${schema}' AND t.typname = '${enumName}' AND e.enumlabel = '${fromValue}'
      ) INTO has_from;

      SELECT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = '${schema}' AND t.typname = '${enumName}' AND e.enumlabel = '${toValue}'
      ) INTO has_to;

      IF has_from AND NOT has_to THEN
        EXECUTE format(
          'ALTER TYPE %I.%I RENAME VALUE %L TO %L',
          '${schema}',
          '${enumName}',
          '${fromValue}',
          '${toValue}'
        );
      END IF;
    END$$;
  `);
}

export class AddCounterDeliveryOrderFields1773700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await renameEnumValueIfExists(
      queryRunner,
      'public',
      'orders_type_enum',
      'takeaway',
      'counter',
    );
    await renameEnumValueIfExists(
      queryRunner,
      'business',
      'orders_type_enum',
      'takeaway',
      'counter',
    );

    await ensureEnumValue(queryRunner, 'public', 'orders_type_enum', 'counter');
    await ensureEnumValue(
      queryRunner,
      'business',
      'orders_type_enum',
      'counter',
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public' AND t.typname = 'orders_pickup_type_enum'
        ) THEN
          CREATE TYPE public.orders_pickup_type_enum AS ENUM (
            'immediate',
            'scheduled'
          );
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'business' AND t.typname = 'orders_pickup_type_enum'
        ) THEN
          CREATE TYPE business.orders_pickup_type_enum AS ENUM (
            'immediate',
            'scheduled'
          );
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public' AND t.typname = 'orders_delivery_status_enum'
        ) THEN
          CREATE TYPE public.orders_delivery_status_enum AS ENUM (
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'on_the_way',
            'delivered',
            'cancelled'
          );
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'business' AND t.typname = 'orders_delivery_status_enum'
        ) THEN
          CREATE TYPE business.orders_delivery_status_enum AS ENUM (
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'on_the_way',
            'delivered',
            'cancelled'
          );
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE business.orders
      ADD COLUMN IF NOT EXISTS pickup_type public.orders_pickup_type_enum,
      ADD COLUMN IF NOT EXISTS pickup_time timestamp,
      ADD COLUMN IF NOT EXISTS delivery_status public.orders_delivery_status_enum,
      ADD COLUMN IF NOT EXISTS delivery_address text,
      ADD COLUMN IF NOT EXISTS delivery_phone text,
      ADD COLUMN IF NOT EXISTS customer_name text
    `);

    await queryRunner.query(`
      ALTER TABLE business.order_items
      ADD COLUMN IF NOT EXISTS send_to_kitchen boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE business.menu_items
      ADD COLUMN IF NOT EXISTS requires_kitchen boolean NOT NULL DEFAULT true
    `);

  }

  public async down(): Promise<void> {
    // Non-destructive rollback: keep new enum values/columns to preserve data.
  }
}
