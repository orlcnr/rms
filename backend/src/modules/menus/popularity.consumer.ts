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
    ) { }

    @EventPattern('popularity.update')
    async handlePopularityUpdate(@Payload() data: PopularityUpdateEvent) {
        this.logger.log(`Processing popularity update for restaurant: ${data.restaurantId}`);

        try {
            for (const item of data.items) {
                await this.menuItemRepository
                    .createQueryBuilder()
                    .update(MenuItem)
                    .set({
                        popularity: () => `popularity + ${item.quantity}`,
                    })
                    .where('id = :id', { id: item.menuItemId })
                    .execute();
            }
            this.logger.log(`Successfully updated popularity for ${data.items.length} items`);
        } catch (error) {
            this.logger.error('Error updating menu item popularity', error);
        }
    }
}
