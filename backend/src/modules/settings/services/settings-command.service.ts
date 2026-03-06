import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';
import type { User } from '../../users/entities/user.entity';
import {
  RestaurantSetting,
  SettingType,
} from '../entities/restaurant-setting.entity';
import { RestaurantSettingRepository } from '../repositories/restaurant-setting.repository';
import { SettingsValueNormalizerService } from './settings-value-normalizer.service';

@Injectable()
export class SettingsCommandService {
  constructor(
    private readonly settingsRepository: RestaurantSettingRepository,
    private readonly valueNormalizer: SettingsValueNormalizerService,
    private readonly auditService: AuditService,
  ) {}

  async updateSetting(
    restaurantId: string,
    key: string,
    value: unknown,
    type: SettingType = SettingType.STRING,
    group = 'general',
    actor?: User,
    request?: Request,
  ): Promise<RestaurantSetting> {
    const before = await this.settingsRepository.findOneByRestaurantAndKey(
      restaurantId,
      key,
    );
    let setting = before;

    const normalizedValue = this.valueNormalizer.normalizeForWrite(key, value);

    let stringValue = String(normalizedValue);
    let resolvedType = type;
    let resolvedGroup = group;

    if (key === this.valueNormalizer.getEnabledPaymentMethodsKey()) {
      stringValue = JSON.stringify(normalizedValue);
      resolvedType = SettingType.STRING;
      resolvedGroup = 'payment';
    }

    if (setting) {
      setting.value = stringValue;
      setting.type = resolvedType;
      setting.group = resolvedGroup;
    } else {
      setting = this.settingsRepository.create({
        restaurant_id: restaurantId,
        key,
        value: stringValue,
        type: resolvedType,
        group: resolvedGroup,
      });
    }

    const saved = await this.settingsRepository.save(setting);

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.SETTING_UPDATED,
        resource: 'SETTINGS',
        user_id: actor?.id,
        user_name: actor?.first_name
          ? `${actor.first_name} ${actor.last_name || ''}`.trim()
          : undefined,
        restaurant_id: restaurantId,
        payload: {
          key,
          type: saved.type,
          group: saved.group,
        },
        changes: sanitizeAuditChanges({
          before: before
            ? {
                value: before.value,
                type: before.type,
                group: before.group,
              }
            : undefined,
          after: {
            value: saved.value,
            type: saved.type,
            group: saved.group,
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'SettingsCommandService.updateSetting',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return saved;
  }
}
