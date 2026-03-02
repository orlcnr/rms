import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RestaurantSetting,
  SettingType,
} from './entities/restaurant-setting.entity';
import { PaymentMethod } from '../payments/entities/payment.entity';

const ENABLED_PAYMENT_METHODS_KEY = 'enabled_payment_methods';

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
    if (!restaurantId) {
      this.logger.warn(
        `getSetting called with empty restaurantId for key=${key}. Returning default: ${defaultValue}`,
      );
      return defaultValue;
    }

    const setting = await this.settingRepository.findOne({
      where: { restaurant_id: restaurantId, key },
    });

    if (!setting) {
      this.logger.debug(
        `Setting ${key} not found for restaurant ${restaurantId}. Returning default: ${defaultValue}`,
      );
      return defaultValue;
    }

    const parsedValue = this.parseValue(setting.value, setting.type);
    if (key === ENABLED_PAYMENT_METHODS_KEY) {
      return this.parseEnabledPaymentMethods(parsedValue);
    }

    return parsedValue;
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

    let stringValue = String(value);
    let resolvedType = type;
    let resolvedGroup = group;

    if (key === ENABLED_PAYMENT_METHODS_KEY) {
      const normalizedMethods = this.normalizeEnabledPaymentMethods(value);
      stringValue = JSON.stringify(normalizedMethods);
      resolvedType = SettingType.STRING;
      resolvedGroup = 'payment';
    }

    if (setting) {
      setting.value = stringValue;
      setting.type = resolvedType;
      setting.group = resolvedGroup;
    } else {
      setting = this.settingRepository.create({
        restaurant_id: restaurantId,
        key,
        value: stringValue,
        type: resolvedType,
        group: resolvedGroup,
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
    includeMeta = false,
  ): Promise<Record<string, any>> {
    const settings = await this.settingRepository.find({
      where: { restaurant_id: restaurantId, group },
    });

    return settings.reduce((acc, setting) => {
      const parsedValue = this.parseValue(setting.value, setting.type);
      const normalizedValue =
        setting.key === ENABLED_PAYMENT_METHODS_KEY
          ? this.parseEnabledPaymentMethods(parsedValue)
          : parsedValue;
      acc[setting.key] = includeMeta
        ? {
            value: normalizedValue,
            type: setting.type,
            group: setting.group,
          }
        : normalizedValue;
      return acc;
    }, {});
  }

  private parseEnabledPaymentMethods(value: any): PaymentMethod[] {
    const defaults = Object.values(PaymentMethod);

    if (Array.isArray(value)) {
      const filtered = value.filter((method): method is PaymentMethod =>
        Object.values(PaymentMethod).includes(method as PaymentMethod),
      );
      return filtered.length > 0 ? filtered : defaults;
    }

    if (typeof value !== 'string' || !value.trim()) {
      return defaults;
    }

    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return defaults;
      }

      const filtered = parsed.filter((method): method is PaymentMethod =>
        Object.values(PaymentMethod).includes(method as PaymentMethod),
      );
      return filtered.length > 0 ? filtered : defaults;
    } catch {
      return defaults;
    }
  }

  private normalizeEnabledPaymentMethods(value: any): PaymentMethod[] {
    const parsed =
      typeof value === 'string' ? this.safeJsonParse(value) : value;

    if (!Array.isArray(parsed)) {
      throw new BadRequestException(
        'enabled_payment_methods bir dizi olmalıdır',
      );
    }

    const availableMethods = new Set(Object.values(PaymentMethod));
    const seen = new Set<PaymentMethod>();
    const normalized: PaymentMethod[] = [];

    for (const item of parsed) {
      if (
        typeof item !== 'string' ||
        !availableMethods.has(item as PaymentMethod)
      ) {
        throw new BadRequestException(
          `Geçersiz ödeme yöntemi: ${String(item)}`,
        );
      }
      const method = item as PaymentMethod;
      if (!seen.has(method)) {
        normalized.push(method);
        seen.add(method);
      }
    }

    if (normalized.length === 0) {
      throw new BadRequestException('En az bir ödeme yöntemi seçilmelidir');
    }

    return normalized;
  }

  private safeJsonParse(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
