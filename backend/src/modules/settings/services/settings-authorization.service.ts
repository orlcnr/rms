import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '../../../common/enums/role.enum';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SettingsAuthorizationService {
  assertRestaurantAccess(user: User, restaurantId: string): void {
    if (user.role === Role.SUPER_ADMIN) {
      return;
    }

    if (user.restaurant_id === restaurantId) {
      return;
    }

    throw new ForbiddenException('Bu restorana erişim yetkiniz yok');
  }
}
