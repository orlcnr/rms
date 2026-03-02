import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCashMovementBooleanFlags1772368250084 implements MigrationInterface {
  name = 'AddCashMovementBooleanFlags1772368250084';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop constraints and indexes if they exist
    await queryRunner.query(
      `ALTER TABLE "business"."orders" DROP CONSTRAINT IF EXISTS "FK_orders_customer"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "business"."IDX_88acd889fbe17d0e16cc4bc917"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "business"."IDX_business_rules_restaurant_key"`,
    );

    // Helper to create enum if not exists
    const createEnumIfNotExists = async (
      schemaName: string,
      typeName: string,
      values: string[],
    ) => {
      const result = await queryRunner.query(
        `SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = '${typeName}' AND n.nspname = '${schemaName}'`,
      );
      if (result.length === 0) {
        await queryRunner.query(
          `CREATE TYPE "${schemaName}"."${typeName}" AS ENUM(${values.map((v) => `'${v}'`).join(', ')})`,
        );
      } else {
        const existingValues = (
          await queryRunner.query(
            `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = '${typeName}' AND n.nspname = '${schemaName}'`,
          )
        ).map((r) => r.enumlabel);
        for (const value of values) {
          if (!existingValues.includes(value)) {
            try {
              await queryRunner.query(
                `ALTER TYPE "${schemaName}"."${typeName}" ADD VALUE '${value}'`,
              );
            } catch (e) {
              console.warn(
                `Could not add value ${value} to enum ${typeName}: ${e.message}`,
              );
            }
          }
        }
      }
    };

    // Helper to add column if not exists
    const addColumnIfNotExists = async (
      table: string,
      column: string,
      typeAndProps: string,
    ) => {
      const [schemaName, tableName] = table.split('.');
      const result = await queryRunner.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = '${schemaName}' AND table_name = '${tableName}' AND column_name = '${column}'`,
      );
      if (result.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "${schemaName}"."${tableName}" ADD "${column}" ${typeAndProps}`,
        );
      }
    };

    // Helper to convert column to enum safely
    const convertToEnum = async (
      table: string,
      column: string,
      enumSchema: string,
      enumName: string,
      defaultVal?: string,
    ) => {
      const [tableSchema, tableName] = table.split('.');
      const columnInfo = await queryRunner.query(
        `SELECT udt_name FROM information_schema.columns WHERE table_schema = '${tableSchema}' AND table_name = '${tableName}' AND column_name = '${column}'`,
      );

      if (columnInfo.length > 0) {
        const currentType = columnInfo[0].udt_name;
        if (currentType !== enumName) {
          await queryRunner.query(
            `ALTER TABLE "${tableSchema}"."${tableName}" ALTER COLUMN "${column}" TYPE "${enumSchema}"."${enumName}" USING "${column}"::text::"${enumSchema}"."${enumName}"`,
          );
          if (defaultVal !== undefined) {
            await queryRunner.query(
              `ALTER TABLE "${tableSchema}"."${tableName}" ALTER COLUMN "${column}" SET DEFAULT '${defaultVal}'`,
            );
          }
        }
      } else {
        const nullability = defaultVal !== undefined ? 'NOT NULL' : '';
        const def = defaultVal !== undefined ? `DEFAULT '${defaultVal}'` : '';
        await queryRunner.query(
          `ALTER TABLE "${tableSchema}"."${tableName}" ADD "${column}" "${enumSchema}"."${enumName}" ${nullability} ${def}`,
        );
      }
    };

    await createEnumIfNotExists('business', 'restaurant_settings_type_enum', [
      'number',
      'boolean',
      'string',
    ]);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "business"."restaurant_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "key" character varying(255) NOT NULL, "value" text NOT NULL, "type" "business"."restaurant_settings_type_enum" NOT NULL DEFAULT 'string', "group" character varying(100) NOT NULL DEFAULT 'general', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_86c54f65224cc80e10e9848aace" UNIQUE ("restaurant_id", "key"), CONSTRAINT "PK_21a6a6bcfd4a7c5ba4c80f7080c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c5599d627a692ae09216d3e968" ON "business"."restaurant_settings" ("restaurant_id", "group") `,
    );

    await addColumnIfNotExists(
      'business.customers',
      'restaurant_id',
      'uuid NOT NULL',
    );
    await addColumnIfNotExists(
      'business.customers',
      'total_debt',
      "numeric(10,2) NOT NULL DEFAULT '0'",
    );
    await addColumnIfNotExists(
      'business.customers',
      'current_debt',
      "numeric(10,2) NOT NULL DEFAULT '0'",
    );
    await addColumnIfNotExists(
      'business.customers',
      'credit_limit',
      "numeric(10,2) NOT NULL DEFAULT '0'",
    );
    await addColumnIfNotExists(
      'business.customers',
      'credit_limit_enabled',
      'boolean NOT NULL DEFAULT false',
    );
    await addColumnIfNotExists(
      'business.customers',
      'max_open_orders',
      "integer NOT NULL DEFAULT '5'",
    );
    await addColumnIfNotExists(
      'business.reservations',
      'restaurant_id',
      'character varying NOT NULL',
    );
    await addColumnIfNotExists(
      'operations.ingredients',
      'average_cost',
      'numeric(10,2)',
    );
    await addColumnIfNotExists(
      'operations.ingredients',
      'last_price',
      'numeric(10,2)',
    );
    await addColumnIfNotExists(
      'operations.ingredients',
      'previous_price',
      'numeric(10,2)',
    );
    await addColumnIfNotExists(
      'operations.ingredients',
      'price_updated_at',
      'TIMESTAMP',
    );
    await addColumnIfNotExists(
      'operations.payments',
      'restaurant_id',
      'uuid NOT NULL',
    );
    await addColumnIfNotExists('operations.payments', 'customer_id', 'uuid');
    await addColumnIfNotExists(
      'operations.payments',
      'cash_received',
      'numeric(10,2)',
    );
    await addColumnIfNotExists(
      'operations.payments',
      'change_given',
      'numeric(10,2)',
    );
    await addColumnIfNotExists(
      'operations.payments',
      'discount_reason',
      'text',
    );
    await addColumnIfNotExists(
      'operations.payments',
      'original_payment_id',
      'uuid',
    );
    await addColumnIfNotExists(
      'operations.payments',
      'tip_amount',
      'numeric(10,2)',
    );
    await addColumnIfNotExists(
      'operations.payments',
      'commission_rate',
      'numeric(5,2)',
    );
    await addColumnIfNotExists(
      'operations.payments',
      'net_tip_amount',
      'numeric(10,2)',
    );
    await addColumnIfNotExists(
      'operations.stock_movements',
      'unit_price',
      'numeric(10,2)',
    );
    await addColumnIfNotExists(
      'operations.stock_movements',
      'supplier_id',
      'character varying',
    );
    await addColumnIfNotExists(
      'operations.cash_movements',
      'is_void',
      'boolean NOT NULL DEFAULT false',
    );
    await addColumnIfNotExists(
      'operations.cash_movements',
      'is_tip',
      'boolean NOT NULL DEFAULT false',
    );
    await addColumnIfNotExists(
      'operations.cash_movements',
      'is_opening_balance',
      'boolean NOT NULL DEFAULT false',
    );
    await addColumnIfNotExists(
      'operations.cash_movements',
      'is_closing_difference',
      'boolean NOT NULL DEFAULT false',
    );
    await addColumnIfNotExists(
      'operations.cash_movements',
      'is_manual_cash_in',
      'boolean NOT NULL DEFAULT false',
    );
    await addColumnIfNotExists(
      'operations.cash_movements',
      'is_manual_cash_out',
      'boolean NOT NULL DEFAULT false',
    );

    await createEnumIfNotExists('business', 'users_role_enum', [
      'super_admin',
      'restaurant_owner',
      'manager',
      'waiter',
      'chef',
      'customer',
    ]);
    await convertToEnum(
      'business.users',
      'role',
      'business',
      'users_role_enum',
      'customer',
    );

    await queryRunner.query(
      `ALTER TABLE "business"."customers" DROP CONSTRAINT IF EXISTS "UQ_88acd889fbe17d0e16cc4bc9174"`,
    );

    await createEnumIfNotExists('business', 'reservations_status_enum', [
      'pending',
      'confirmed',
      'completed',
      'cancelled',
      'no_show',
    ]);
    await convertToEnum(
      'business.reservations',
      'status',
      'business',
      'reservations_status_enum',
      'pending',
    );

    await createEnumIfNotExists('business', 'tables_status_enum', [
      'available',
      'occupied',
      'reserved',
      'out_of_service',
    ]);
    await convertToEnum(
      'business.tables',
      'status',
      'business',
      'tables_status_enum',
      'available',
    );

    await createEnumIfNotExists('business', 'business_rules_category_enum', [
      'CASH',
      'ORDER',
      'INVENTORY',
      'MENU',
      'SYSTEM',
    ]);
    await convertToEnum(
      'business.business_rules',
      'category',
      'business',
      'business_rules_category_enum',
    );

    await createEnumIfNotExists('business', 'business_rules_key_enum', [
      'CASH_CHECK_OPEN_TABLES',
      'ORDER_MANDATORY_TABLE',
      'ORDER_PREVENT_VOID',
      'INVENTORY_PREVENT_DELETE',
      'INVENTORY_LOW_STOCK_ALERT',
      'MENU_PREVENT_DELETE_ITEM',
      'SYSTEM_MAINTENANCE_MODE',
      'ORDER_REQUIRE_OPEN_CASH',
    ]);
    await convertToEnum(
      'business.business_rules',
      'key',
      'business',
      'business_rules_key_enum',
    );

    await createEnumIfNotExists('public_api', 'guest_orders_status_enum', [
      'draft',
      'submitted',
      'approved',
      'rejected',
      'expired',
      'converted',
    ]);
    await convertToEnum(
      'public_api.guest_orders',
      'status',
      'public_api',
      'guest_orders_status_enum',
      'draft',
    );

    await createEnumIfNotExists('public_api', 'guest_order_events_type_enum', [
      'created',
      'updated',
      'submitted',
      'approved',
      'rejected',
      'converted',
      'expired',
    ]);
    await convertToEnum(
      'public_api.guest_order_events',
      'type',
      'public_api',
      'guest_order_events_type_enum',
    );

    await createEnumIfNotExists('business', 'order_items_status_enum', [
      'pending',
      'preparing',
      'ready',
      'served',
      'paid',
      'on_way',
      'delivered',
      'cancelled',
    ]);
    await convertToEnum(
      'business.order_items',
      'status',
      'business',
      'order_items_status_enum',
      'pending',
    );

    await createEnumIfNotExists('business', 'orders_status_enum', [
      'pending',
      'preparing',
      'ready',
      'served',
      'paid',
      'on_way',
      'delivered',
      'cancelled',
    ]);
    await convertToEnum(
      'business.orders',
      'status',
      'business',
      'orders_status_enum',
      'pending',
    );

    await createEnumIfNotExists('operations', 'payments_payment_method_enum', [
      'cash',
      'credit_card',
      'debit_card',
      'digital_wallet',
      'bank_transfer',
      'open_account',
      'meal_voucher',
    ]);
    await convertToEnum(
      'operations.payments',
      'payment_method',
      'operations',
      'payments_payment_method_enum',
    );

    await queryRunner.query(
      `ALTER TABLE "operations"."payments" ALTER COLUMN "final_amount" SET DEFAULT '0'`,
    );

    await createEnumIfNotExists('operations', 'payments_status_enum', [
      'completed',
      'failed',
      'pending',
      'refunded',
      'cancelled',
    ]);
    await convertToEnum(
      'operations.payments',
      'status',
      'operations',
      'payments_status_enum',
      'completed',
    );

    await createEnumIfNotExists('infrastructure', 'notifications_type_enum', [
      'new_order',
      'order_status',
      'guest_order',
      'waiter_call',
      'bill_request',
      'system',
    ]);
    await convertToEnum(
      'infrastructure.notifications',
      'type',
      'infrastructure',
      'notifications_type_enum',
      'system',
    );

    await createEnumIfNotExists('operations', 'stock_movements_type_enum', [
      'IN',
      'OUT',
      'ADJUST',
    ]);
    await convertToEnum(
      'operations.stock_movements',
      'type',
      'operations',
      'stock_movements_type_enum',
    );

    await createEnumIfNotExists('operations', 'cash_movements_type_enum', [
      'sale',
      'in',
      'out',
    ]);
    await convertToEnum(
      'operations.cash_movements',
      'type',
      'operations',
      'cash_movements_type_enum',
    );

    await createEnumIfNotExists(
      'operations',
      'cash_movements_payment_method_enum',
      [
        'cash',
        'credit_card',
        'debit_card',
        'digital_wallet',
        'bank_transfer',
        'open_account',
        'meal_voucher',
      ],
    );
    await convertToEnum(
      'operations.cash_movements',
      'payment_method',
      'operations',
      'cash_movements_payment_method_enum',
    );

    await createEnumIfNotExists('operations', 'cash_sessions_status_enum', [
      'open',
      'closed',
    ]);
    await convertToEnum(
      'operations.cash_sessions',
      'status',
      'operations',
      'cash_sessions_status_enum',
      'open',
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_customers_phone_restaurant" ON "business"."customers" ("phone") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_customers_restaurant" ON "business"."customers" ("restaurant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reservations_restaurant_time" ON "business"."reservations" ("restaurant_id", "reservation_time") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_34314727166de4858d2134b1b7" ON "business"."business_rules" ("restaurant_id", "key") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d19273a0dd01a303a5d8fcba58" ON "operations"."payments" ("restaurant_id") `,
    );

    const addConstraintIfNotExists = async (
      table: string,
      constraintName: string,
      definition: string,
    ) => {
      const [schemaName, tableName] = table.split('.');
      const result = await queryRunner.query(
        `SELECT 1 FROM information_schema.table_constraints WHERE table_schema = '${schemaName}' AND table_name = '${tableName}' AND constraint_name = '${constraintName}'`,
      );
      if (result.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "${schemaName}"."${tableName}" ADD CONSTRAINT "${constraintName}" ${definition}`,
        );
      }
    };

    await addConstraintIfNotExists(
      'business.customers',
      'FK_76038a7f0cc133ac7d2c387a7cf',
      'FOREIGN KEY ("restaurant_id") REFERENCES "business"."restaurants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await addConstraintIfNotExists(
      'business.orders',
      'FK_772d0ce0473ac2ccfa26060dbe9',
      'FOREIGN KEY ("customer_id") REFERENCES "business"."customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await addConstraintIfNotExists(
      'operations.payments',
      'FK_d19273a0dd01a303a5d8fcba583',
      'FOREIGN KEY ("restaurant_id") REFERENCES "business"."restaurants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await addConstraintIfNotExists(
      'operations.payments',
      'FK_d0b02233df1c52323107fe7b4d7',
      'FOREIGN KEY ("customer_id") REFERENCES "business"."customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
