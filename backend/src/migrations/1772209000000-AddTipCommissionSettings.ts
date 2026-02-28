import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTipCommissionSettings1772209000000 implements MigrationInterface {
  name = 'AddTipCommissionSettings1772209000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tüm restoranlar için tip_commission_enabled ayarı
    await queryRunner.query(`
            INSERT INTO business.restaurant_settings (id, restaurant_id, key, value, type, "group", created_at, updated_at)
            SELECT 
                gen_random_uuid() as id,
                id as restaurant_id,
                'tip_commission_enabled' as key,
                'true' as value,
                'boolean' as type,
                'payment' as "group",
                NOW() as created_at,
                NOW() as updated_at
            FROM business.restaurants
            WHERE deleted_at IS NULL
            ON CONFLICT (restaurant_id, key) DO NOTHING
        `);

    // Tüm restoranlar için tip_commission_rate ayarı
    await queryRunner.query(`
            INSERT INTO business.restaurant_settings (id, restaurant_id, key, value, type, "group", created_at, updated_at)
            SELECT 
                gen_random_uuid() as id,
                id as restaurant_id,
                'tip_commission_rate' as key,
                '0.02' as value,
                'number' as type,
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
            WHERE key IN ('tip_commission_enabled', 'tip_commission_rate')
        `);
  }
}
