import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../users/entities/user.entity';
import {
  RestaurantSetting,
  SettingType,
} from './entities/restaurant-setting.entity';
import { SettingsAuthorizationService } from './services/settings-authorization.service';
import { SettingsCommandService } from './services/settings-command.service';
import { SettingsQueryService } from './services/settings-query.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsQueryService: SettingsQueryService,
    private readonly settingsCommandService: SettingsCommandService,
    private readonly settingsAuthorizationService: SettingsAuthorizationService,
  ) {}

  assertRestaurantAccess(user: User, restaurantId: string): void {
    this.settingsAuthorizationService.assertRestaurantAccess(
      user,
      restaurantId,
    );
  }

  getSetting<T = unknown>(
    restaurantId: string,
    key: string,
    defaultValue?: T,
  ): Promise<T> {
    return this.settingsQueryService.getSetting(
      restaurantId,
      key,
      defaultValue,
    );
  }

  getSettingsByGroup(
    restaurantId: string,
    group: string,
    includeMeta = false,
  ): Promise<Record<string, unknown>> {
    return this.settingsQueryService.getSettingsByGroup(
      restaurantId,
      group,
      includeMeta,
    );
  }

  updateSetting(
    restaurantId: string,
    key: string,
    value: unknown,
    type: SettingType = SettingType.STRING,
    group = 'general',
    actor?: User,
    request?: Request,
  ): Promise<RestaurantSetting> {
    return this.settingsCommandService.updateSetting(
      restaurantId,
      key,
      value,
      type,
      group,
      actor,
      request,
    );
  }
}
