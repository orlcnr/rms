import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantSetting } from '../entities/restaurant-setting.entity';

@Injectable()
export class RestaurantSettingRepository {
  constructor(
    @InjectRepository(RestaurantSetting)
    private readonly repository: Repository<RestaurantSetting>,
  ) {}

  findOneByRestaurantAndKey(restaurantId: string, key: string) {
    return this.repository.findOne({
      where: { restaurant_id: restaurantId, key },
    });
  }

  findByRestaurantAndGroup(restaurantId: string, group: string) {
    return this.repository.find({
      where: { restaurant_id: restaurantId, group },
    });
  }

  create(payload: Partial<RestaurantSetting>) {
    return this.repository.create(payload);
  }

  save(setting: RestaurantSetting) {
    return this.repository.save(setting);
  }
}
