import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { Category } from './entities/category.entity';
import { MenuItem } from './entities/menu-item.entity';

import { InventoryModule } from '../inventory/inventory.module';

import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PopularityConsumer } from './popularity.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, MenuItem]),
    InventoryModule,
    ConfigModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
          },
          ttl: 600, // 10 minutes default
        }),
      }),
    }),
  ],
  controllers: [MenusController, PopularityConsumer],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule { }
