import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RestaurantSetting,
  SettingType,
} from './entities/restaurant-setting.entity';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(RestaurantSetting)
    private readonly settingRepository: Repository<RestaurantSetting>,
  ) {}

  async getSetting(
    restaurantId: string,
    key: string,
    defaultValue?: any,
  ): Promise<any> {
    const setting = await this.settingRepository.findOne({
      where: { restaurant_id: restaurantId, key },
    });

    if (!setting) {
      this.logger.debug(
        `Setting ${key} not found for restaurant ${restaurantId}. Returning default: ${defaultValue}`,
      );
      return defaultValue;
    }

    return this.parseValue(setting.value, setting.type);
  }

  async updateSetting(
    restaurantId: string,
    key: string,
    value: any,
    type: SettingType = SettingType.STRING,
    group: string = 'general',
  ): Promise<RestaurantSetting> {
    let setting = await this.settingRepository.findOne({
      where: { restaurant_id: restaurantId, key },
    });

    const stringValue = String(value);

    if (setting) {
      setting.value = stringValue;
      setting.type = type;
      setting.group = group;
    } else {
      setting = this.settingRepository.create({
        restaurant_id: restaurantId,
        key,
        value: stringValue,
        type,
        group,
      });
    }

    return this.settingRepository.save(setting);
  }

  private parseValue(value: string, type: SettingType): any {
    switch (type) {
      case SettingType.NUMBER:
        return parseFloat(value);
      case SettingType.BOOLEAN:
        return value === 'true' || value === '1';
      case SettingType.STRING:
      default:
        return value;
    }
  }

  /**
   * Get multiple settings for a restaurant by group
   */
  async getSettingsByGroup(
    restaurantId: string,
    group: string,
  ): Promise<Record<string, any>> {
    const settings = await this.settingRepository.find({
      where: { restaurant_id: restaurantId, group },
    });

    return settings.reduce((acc, setting) => {
      acc[setting.key] = this.parseValue(setting.value, setting.type);
      return acc;
    }, {});
  }
}
