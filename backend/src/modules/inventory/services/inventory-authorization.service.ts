import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Injectable()
export class InventoryAuthorizationService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
  ) {}

  async assertRestaurantScopeAccess(
    actor: User,
    targetRestaurantId: string,
  ): Promise<void> {
    if (!actor.restaurant_id) {
      throw new ForbiddenException('Restaurant scope bulunamadı');
    }

    if (actor.restaurant_id === targetRestaurantId) {
      return;
    }

    const [actorRestaurant, targetRestaurant] = await Promise.all([
      this.restaurantRepository.findOne({
        where: { id: actor.restaurant_id },
        select: ['id', 'brand_id'],
      }),
      this.restaurantRepository.findOne({
        where: { id: targetRestaurantId },
        select: ['id', 'brand_id'],
      }),
    ]);

    if (!actorRestaurant || !targetRestaurant) {
      throw new ForbiddenException('Şube erişimi doğrulanamadı');
    }

    if (!actorRestaurant.brand_id || !targetRestaurant.brand_id) {
      throw new ForbiddenException('Bu şube için erişim yetkiniz yok');
    }

    if (actorRestaurant.brand_id !== targetRestaurant.brand_id) {
      throw new ForbiddenException('Farklı brand şubesi için erişim yok');
    }
  }
}
