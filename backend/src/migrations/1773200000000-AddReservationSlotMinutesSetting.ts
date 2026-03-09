import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReservationSlotMinutesSetting1773200000000
  implements MigrationInterface
{
  name = 'AddReservationSlotMinutesSetting1773200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO business.restaurant_settings (
        id,
        restaurant_id,
        key,
        value,
        type,
        "group",
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        r.id,
        'reservation_slot_minutes',
        '120',
        'number',
        'general',
        NOW(),
        NOW()
      FROM business.restaurants r
      WHERE r.deleted_at IS NULL
      ON CONFLICT (restaurant_id, key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM business.restaurant_settings
      WHERE key = 'reservation_slot_minutes'
    `);
  }
}
