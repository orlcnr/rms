import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '../../users/entities/user.entity';
import { AreaRepository } from '../repositories/area.repository';
import { TableRepository } from '../repositories/table.repository';

@Injectable()
export class TablesAuthorizationService {
  constructor(
    private readonly areaRepository: AreaRepository,
    private readonly tableRepository: TableRepository,
  ) {}

  getRestaurantId(actor: User): string {
    const restaurantId = actor.restaurant_id;
    if (!restaurantId) {
      throw new ForbiddenException('Restaurant scope bulunamadı');
    }
    return restaurantId;
  }

  async assertAreaAccess(areaId: string, actor: User): Promise<void> {
    const restaurantId = this.getRestaurantId(actor);
    const area = await this.areaRepository.findOneByIdAndRestaurant(
      areaId,
      restaurantId,
    );
    if (!area) {
      throw new NotFoundException('Alan bulunamadı');
    }
  }

  async assertTableAccess(tableId: string, actor: User): Promise<void> {
    const restaurantId = this.getRestaurantId(actor);
    const table = await this.tableRepository.findOneByIdAndRestaurant(
      tableId,
      restaurantId,
    );
    if (!table) {
      throw new NotFoundException('Masa bulunamadı');
    }
  }
}
