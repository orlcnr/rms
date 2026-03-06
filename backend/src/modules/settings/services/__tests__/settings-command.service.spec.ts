import { SettingType } from '../../entities/restaurant-setting.entity';
import { SettingsCommandService } from '../settings-command.service';
import { SettingsValueNormalizerService } from '../settings-value-normalizer.service';

describe('SettingsCommandService', () => {
  const restaurantId = '376062a2-f665-4ea8-b93a-b79f4f95a8b5';

  function buildService() {
    const repository = {
      findOneByRestaurantAndKey: jest.fn(),
      create: jest.fn((payload: Record<string, unknown>) => payload),
      save: jest.fn((payload: Record<string, unknown>) => payload),
    };
    const normalizer = new SettingsValueNormalizerService();
    const auditService = {
      safeEmitLog: jest.fn().mockResolvedValue(undefined),
      markRequestAsAudited: jest.fn(),
    };
    const service = new SettingsCommandService(
      repository as never,
      normalizer,
      auditService as never,
    );
    return { service, repository };
  }

  it('creates new setting when key does not exist', async () => {
    const { service, repository } = buildService();
    repository.findOneByRestaurantAndKey.mockResolvedValue(null);

    const result = await service.updateSetting(
      restaurantId,
      'tip_commission_rate',
      0.02,
      SettingType.NUMBER,
      'payment',
    );

    expect(repository.create).toHaveBeenCalled();
    expect(result).toMatchObject({
      restaurant_id: restaurantId,
      key: 'tip_commission_rate',
      value: '0.02',
      type: SettingType.NUMBER,
      group: 'payment',
    });
  });

  it('forces payment group and string type for enabled_payment_methods', async () => {
    const { service, repository } = buildService();
    repository.findOneByRestaurantAndKey.mockResolvedValue(null);

    const result = await service.updateSetting(
      restaurantId,
      'enabled_payment_methods',
      ['cash'],
      SettingType.BOOLEAN,
      'general',
    );

    expect(result).toMatchObject({
      type: SettingType.STRING,
      group: 'payment',
    });
  });
});
