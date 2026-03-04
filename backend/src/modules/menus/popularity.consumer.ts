import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';

interface PopularityUpdateEvent {
  restaurantId: string;
  items: {
    menuItemId: string;
    quantity: number;
  }[];
}

@Controller()
export class PopularityConsumer {
  private readonly logger = new Logger(PopularityConsumer.name);

  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
  ) {}

  @EventPattern('popularity.update')
  async handlePopularityUpdate(@Payload() data: PopularityUpdateEvent) {
    this.logger.log(
      `Processing popularity update for restaurant: ${data.restaurantId}`,
    );

    try {
      const aggregatedItems = new Map<string, number>();

      for (const item of data.items) {
        if (item.quantity <= 0) {
          continue;
        }

        aggregatedItems.set(
          item.menuItemId,
          (aggregatedItems.get(item.menuItemId) || 0) + item.quantity,
        );
      }

      if (aggregatedItems.size === 0) {
        return;
      }

      const ids = [...aggregatedItems.keys()];
      const caseParameters = ids.reduce<Record<string, string | number>>(
        (acc, id, index) => {
          acc[`id${index}`] = id;
          acc[`qty${index}`] = aggregatedItems.get(id) || 0;
          return acc;
        },
        {},
      );
      const cases = ids
        .map((_, index) => `WHEN :id${index} THEN :qty${index}`)
        .join(' ');

      await this.menuItemRepository
        .createQueryBuilder()
        .update(MenuItem)
        .set({
          popularity: () =>
            `popularity + CASE id ${cases} ELSE 0 END`,
        })
        .where('id IN (:...ids)', { ids })
        .andWhere('restaurant_id = :restaurantId', {
          restaurantId: data.restaurantId,
        })
        .setParameters(caseParameters)
        .execute();

      this.logger.log(
        `Successfully updated popularity for ${aggregatedItems.size} items`,
      );
    } catch (error) {
      this.logger.error('Error updating menu item popularity', error);
    }
  }
}
