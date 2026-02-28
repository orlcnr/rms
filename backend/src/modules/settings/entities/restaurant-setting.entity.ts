import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

export enum SettingType {
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  STRING = 'string',
}

@Entity('restaurant_settings', { schema: 'business' })
@Unique(['restaurant_id', 'key'])
@Index(['restaurant_id', 'group'])
export class RestaurantSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  restaurant_id: string;

  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({
    type: 'enum',
    enum: SettingType,
    default: SettingType.STRING,
  })
  type: SettingType;

  @Column({ type: 'varchar', length: 100, default: 'general' })
  group: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
