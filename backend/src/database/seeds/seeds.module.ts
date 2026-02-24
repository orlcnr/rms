import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Restaurant } from '../../modules/restaurants/entities/restaurant.entity';
import { UserSeeder } from './user.seeder';
import { RestaurantSeeder } from './restaurant.seeder';
import { MainSeeder } from './main.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([User, Restaurant])],
  providers: [UserSeeder, RestaurantSeeder, MainSeeder],
  exports: [MainSeeder],
})
export class SeedsModule {}
