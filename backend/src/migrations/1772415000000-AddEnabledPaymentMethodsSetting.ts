import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnabledPaymentMethodsSetting1772415000000 implements MigrationInterface {
  name = 'AddEnabledPaymentMethodsSetting1772415000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO business.restaurant_settings (id, restaurant_id, key, value, type, "group", created_at, updated_at)
      SELECT
        gen_random_uuid() as id,
        id as restaurant_id,
        'enabled_payment_methods' as key,
        '["cash","credit_card","debit_card","digital_wallet","bank_transfer","open_account","meal_voucher"]' as value,
        'string' as type,
        'payment' as "group",
        NOW() as created_at,
        NOW() as updated_at
      FROM business.restaurants
      WHERE deleted_at IS NULL
      ON CONFLICT (restaurant_id, key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM business.restaurant_settings
      WHERE key = 'enabled_payment_methods'
    `);
  }
}
