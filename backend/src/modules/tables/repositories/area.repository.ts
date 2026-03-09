import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Area } from '../entities/area.entity';

@Injectable()
export class AreaRepository {
  constructor(
    @InjectRepository(Area)
    private readonly repository: Repository<Area>,
  ) {}

  createBaseQuery(restaurantId: string): SelectQueryBuilder<Area> {
    return this.repository
      .createQueryBuilder('area')
      .where('area.restaurant_id = :restaurantId', { restaurantId });
  }

  findOneByIdAndRestaurant(
    id: string,
    restaurantId: string,
  ): Promise<Area | null> {
    return this.repository.findOne({
      where: { id, restaurant_id: restaurantId },
    });
  }

  create(entity: Partial<Area>): Area {
    return this.repository.create(entity);
  }

  save(entity: Area): Promise<Area> {
    return this.repository.save(entity);
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
