import { Injectable, Logger } from '@nestjs/common';
import { RestaurantSetting } from '../entities/restaurant-setting.entity';
import { RestaurantSettingRepository } from '../repositories/restaurant-setting.repository';
import { SettingsValueNormalizerService } from './settings-value-normalizer.service';

@Injectable()
export class SettingsQueryService {
  private readonly logger = new Logger(SettingsQueryService.name);

  constructor(
    private readonly settingsRepository: RestaurantSettingRepository,
    private readonly valueNormalizer: SettingsValueNormalizerService,
  ) {}

  async getSetting<T = unknown>(
    restaurantId: string,
    key: string,
    defaultValue?: T,
  ): Promise<T> {
    if (!restaurantId) {
      this.logger.warn(
        `getSetting called with empty restaurantId for key=${key}. Returning default: ${String(
          defaultValue,
        )}`,
      );
      return defaultValue as T;
    }

    const setting = await this.settingsRepository.findOneByRestaurantAndKey(
      restaurantId,
      key,
    );

    if (!setting) {
      this.logger.debug(
        `Setting ${key} not found for restaurant ${restaurantId}. Returning default: ${String(
          defaultValue,
        )}`,
      );
      return defaultValue as T;
    }

    return this.parseSettingValue(setting) as T;
  }

  async getSettingsByGroup(
    restaurantId: string,
    group: string,
    includeMeta = false,
  ): Promise<Record<string, unknown>> {
    const settings = await this.settingsRepository.findByRestaurantAndGroup(
      restaurantId,
      group,
    );

    return settings.reduce<Record<string, unknown>>((acc, setting) => {
      const parsedValue = this.parseSettingValue(setting);
      acc[setting.key] = includeMeta
        ? {
            value: parsedValue,
            type: setting.type,
            group: setting.group,
            updatedAt: setting.updated_at?.toISOString(),
          }
        : parsedValue;
      return acc;
    }, {});
  }

  private parseSettingValue(setting: RestaurantSetting): unknown {
    const parsedValue = this.valueNormalizer.parseStoredValue(
      setting.value,
      setting.type,
    );

    if (setting.key === this.valueNormalizer.getEnabledPaymentMethodsKey()) {
      return this.valueNormalizer.parseEnabledPaymentMethods(parsedValue);
    }

    if (setting.key === this.valueNormalizer.getPrinterProfilesKey()) {
      return this.valueNormalizer.parsePrinterProfiles(parsedValue);
    }

    return parsedValue;
  }
}
