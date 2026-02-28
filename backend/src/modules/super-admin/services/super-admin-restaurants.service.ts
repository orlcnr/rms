import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { User } from '../../users/entities/user.entity';
import { CreateSA_RestaurantDto } from '../dto/create-restaurant.dto';
import { UpdateSA_RestaurantDto } from '../dto/update-restaurant.dto';
import { PasswordService } from '../../../common/services/password.service';
import { Role } from '../../../common/enums/role.enum';
import { SearchRestaurantDto } from '../dto/search-restaurant.dto';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class SuperAdminRestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private passwordService: PasswordService,
    private mailService: MailService,
  ) {}

  async findAll(queryDto: SearchRestaurantDto) {
    const { page = 1, limit = 20, search, is_active } = queryDto;
    const queryBuilder = this.restaurantRepository
      .createQueryBuilder('restaurant')
      .leftJoinAndSelect('restaurant.owner', 'owner')
      .orderBy('restaurant.created_at', 'DESC');

    if (search) {
      queryBuilder.andWhere(
        '(restaurant.name ILIKE :search OR restaurant.slug ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (is_active !== undefined) {
      queryBuilder.andWhere('restaurant.is_active = :is_active', { is_active });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const restaurant = await this.restaurantRepository
      .createQueryBuilder('restaurant')
      .leftJoinAndSelect('restaurant.owner', 'owner')
      .leftJoinAndSelect('restaurant.users', 'users')
      .where('restaurant.id = :id', { id })
      .getOne();

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    return restaurant;
  }

  async create(createRestaurantDto: CreateSA_RestaurantDto) {
    // Check if slug already exists
    const existingSlug = await this.restaurantRepository
      .createQueryBuilder('restaurant')
      .where('restaurant.slug = :slug', { slug: createRestaurantDto.slug })
      .getOne();

    if (existingSlug) {
      throw new ConflictException(
        `Restaurant with slug '${createRestaurantDto.slug}' already exists`,
      );
    }

    // Check if owner email already exists
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: createRestaurantDto.owner_email })
      .getOne();

    if (existingUser) {
      throw new ConflictException(
        `User with email '${createRestaurantDto.owner_email}' already exists`,
      );
    }

    // Generate secure password for owner
    const generatedPassword = this.passwordService.generateSecurePassword();
    const password_hash =
      await this.passwordService.hashPassword(generatedPassword);

    return await this.restaurantRepository.manager
      .transaction(async (transactionalEntityManager) => {
        // 1. Create owner user first (restaurant_id is nullable)
        const owner = transactionalEntityManager.create(User, {
          email: createRestaurantDto.owner_email,
          first_name: createRestaurantDto.owner_first_name,
          last_name: createRestaurantDto.owner_last_name,
          password_hash,
          role: Role.RESTAURANT_OWNER,
          is_active: true,
          // restaurant_id will be set later
        });

        const savedOwner = await transactionalEntityManager.save(owner);

        // 2. Create restaurant with owner_id
        const restaurant = transactionalEntityManager.create(Restaurant, {
          name: createRestaurantDto.name,
          slug: createRestaurantDto.slug,
          description: createRestaurantDto.description,
          address: createRestaurantDto.address,
          contact_email: createRestaurantDto.contact_email,
          contact_phone: createRestaurantDto.contact_phone,
          google_comment_url: createRestaurantDto.google_comment_url,
          owner_id: savedOwner.id,
        });

        const savedRestaurant =
          await transactionalEntityManager.save(restaurant);

        // 3. Update owner with restaurant_id
        savedOwner.restaurant_id = savedRestaurant.id;
        await transactionalEntityManager.save(savedOwner);

        // 4. Send email to owner with credentials
        // Note: This is after the transaction or we can do it after.
        // Better to do it after the transaction completes to be safe, but let's do it here or just after return.
        return {
          restaurant: savedRestaurant,
          owner: {
            ...savedOwner,
            temporary_password: generatedPassword,
          },
        };
      })
      .then(async (result) => {
        // Send email after transaction success
        await this.mailService.sendWelcomeEmail(
          result.owner.email,
          result.owner.first_name,
          result.owner.temporary_password,
        );
        return result;
      });
  }

  async update(id: string, updateRestaurantDto: UpdateSA_RestaurantDto) {
    const restaurant = await this.findOne(id);

    // Check slug uniqueness if changing
    if (
      updateRestaurantDto.slug &&
      updateRestaurantDto.slug !== restaurant.slug
    ) {
      const existingSlug = await this.restaurantRepository
        .createQueryBuilder('restaurant')
        .where('restaurant.slug = :slug', { slug: updateRestaurantDto.slug })
        .andWhere('restaurant.id != :id', { id })
        .getOne();

      if (existingSlug) {
        throw new ConflictException(
          `Restaurant with slug '${updateRestaurantDto.slug}' already exists`,
        );
      }
    }

    Object.assign(restaurant, updateRestaurantDto);
    return this.restaurantRepository.save(restaurant);
  }

  async remove(id: string) {
    const restaurant = await this.findOne(id);

    // Soft delete - just deactivate
    restaurant.is_active = false;
    await this.restaurantRepository.save(restaurant);

    return { message: 'Restaurant deactivated successfully' };
  }

  async getStats() {
    const totalRestaurants = await this.restaurantRepository.count();
    const activeRestaurants = await this.restaurantRepository
      .createQueryBuilder('restaurant')
      .where('restaurant.is_active = :active', { active: true })
      .getCount();

    return {
      total: totalRestaurants,
      active: activeRestaurants,
      inactive: totalRestaurants - activeRestaurants,
    };
  }
}
