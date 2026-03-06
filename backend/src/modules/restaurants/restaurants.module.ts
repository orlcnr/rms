import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { Restaurant } from './entities/restaurant.entity';
import { User } from '../users/entities/user.entity';
import { RulesModule } from '../rules/rules.module';
import { Brand } from '../brands/entities/brand.entity';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Restaurant, Brand]),
    RulesModule,
    InventoryModule,
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService], // Exported for use in other modules (e.g. Orders, Menus)
})
export class RestaurantsModule {}
