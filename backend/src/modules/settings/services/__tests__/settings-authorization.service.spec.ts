import { ForbiddenException } from '@nestjs/common';
import { Role } from '../../../../common/enums/role.enum';
import { SettingsAuthorizationService } from '../settings-authorization.service';

describe('SettingsAuthorizationService', () => {
  const service = new SettingsAuthorizationService();
  const restaurantId = 'f282b76d-6f7f-4c12-ad66-95d80ebad0ca';

  it('allows super admin', () => {
    expect(() =>
      service.assertRestaurantAccess(
        {
          role: Role.SUPER_ADMIN,
          restaurant_id: 'another',
        } as never,
        restaurantId,
      ),
    ).not.toThrow();
  });

  it('allows same restaurant user', () => {
    expect(() =>
      service.assertRestaurantAccess(
        {
          role: Role.MANAGER,
          restaurant_id: restaurantId,
        } as never,
        restaurantId,
      ),
    ).not.toThrow();
  });

  it('rejects different restaurant user', () => {
    expect(() =>
      service.assertRestaurantAccess(
        {
          role: Role.MANAGER,
          restaurant_id: 'different',
        } as never,
        restaurantId,
      ),
    ).toThrow(ForbiddenException);
  });
});
