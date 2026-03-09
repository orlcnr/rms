import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class ReservationsAuthorizationService {
  assertRestaurantScope(
    actorRestaurantId: string | undefined,
    targetRestaurantId: string,
  ): void {
    if (!actorRestaurantId || actorRestaurantId !== targetRestaurantId) {
      throw new ForbiddenException('Reservation scope forbidden');
    }
  }
}
