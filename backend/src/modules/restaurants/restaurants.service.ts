import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { User } from '../users/entities/user.entity';

import { RulesService } from '../rules/rules.service';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    private readonly rulesService: RulesService,
  ) {}

  async create(
    createRestaurantDto: CreateRestaurantDto,
    user: User,
  ): Promise<Restaurant> {
    const restaurant = this.restaurantRepository.create({
      ...createRestaurantDto,
      owner_id: user.id,
    });
    try {
      const savedRestaurant = await this.restaurantRepository.save(restaurant);
      await this.rulesService.initializeDefaultRules(savedRestaurant.id);
      return savedRestaurant;
    } catch (error) {
      if (error.code === '23505') {
        // Postgres unique_violation
        throw new ConflictException(
          `Restaurant with slug "${createRestaurantDto.slug}" already exists`,
        );
      }
      throw error;
    }
  }

  async findAll(user: User): Promise<Restaurant[]> {
    if (user.role === Role.SUPER_ADMIN) {
      return this.restaurantRepository.find();
    }
    return this.restaurantRepository.find({
      where: { id: user.restaurant_id },
    });
  }

  async findOne(id: string, user: User): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOneBy({ id });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    if (
      user.role !== Role.SUPER_ADMIN &&
      restaurant.id !== user.restaurant_id
    ) {
      throw new ForbiddenException('You do not have access to this restaurant');
    }

    return restaurant;
  }

  async update(
    id: string,
    updateRestaurantDto: UpdateRestaurantDto,
    user: User,
  ): Promise<Restaurant> {
    const restaurant = await this.findOne(id, user); // findOne already checks access
    Object.assign(restaurant, updateRestaurantDto);
    return this.restaurantRepository.save(restaurant);
  }

  async remove(id: string, user: User): Promise<void> {
    await this.findOne(id, user); // Ensure they have access before deleting
    const result = await this.restaurantRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
  }
}
