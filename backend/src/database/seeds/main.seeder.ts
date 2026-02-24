import { Injectable } from '@nestjs/common';
import { UserSeeder } from './user.seeder';
import { RestaurantSeeder } from './restaurant.seeder';

@Injectable()
export class MainSeeder {
  constructor(
    private readonly userSeeder: UserSeeder,
    private readonly restaurantSeeder: RestaurantSeeder,
  ) {}

  async seed() {
    console.log('--- Starting Seed Process ---');
    await this.userSeeder.seed();
    await this.restaurantSeeder.seed();
    console.log('--- Seeding Completed Successfully ---');
  }
}
