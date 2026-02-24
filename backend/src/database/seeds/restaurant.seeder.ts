import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../../modules/restaurants/entities/restaurant.entity';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class RestaurantSeeder {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed() {
    // Find the owner user we just seeded
    const owner = await this.userRepository.findOneBy({
      email: 'owner@tomubulunmeyhanesi.com',
    });
    if (!owner) {
      console.error('Owner user not found for restaurant seeding!');
      return;
    }

    const restaurants = [
      {
        name: 'Tomubulun Meyhanesi',
        slug: 'tomubulun-meyhanesi',
        description: 'Geleneksel lezzetlerin buluşma noktası',
        address: 'İstanbul, Türkiye',
        contact_email: 'info@tomubulunmeyhanesi.com',
        contact_phone: '+90 212 123 4567',
        owner_id: owner.id,
        opening_hours: {
          mon: { open: '12:00', close: '00:00' },
          tue: { open: '12:00', close: '00:00' },
          wed: { open: '12:00', close: '00:00' },
          thu: { open: '12:00', close: '00:00' },
          fri: { open: '12:00', close: '02:00' },
          sat: { open: '12:00', close: '02:00' },
          sun: { open: '12:00', close: '23:00' },
        },
      },
    ];

    for (const data of restaurants) {
      const existing = await this.restaurantRepository.findOneBy({
        slug: data.slug,
      });
      if (!existing) {
        const restaurant = this.restaurantRepository.create(data);
        await this.restaurantRepository.save(restaurant);
        console.log(`Restaurant seeded: ${data.name}`);
      } else {
        console.log(`Restaurant already exists: ${data.name}`);
      }
    }
  }
}
