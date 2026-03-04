import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryRepository } from '../repositories/category.repository';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private getCacheKey(restaurantId: string): string {
    return `menus:categories:${restaurantId}`;
  }

  async clearCache(restaurantId: string): Promise<void> {
    await this.cacheManager.del(this.getCacheKey(restaurantId));
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: createCategoryDto.restaurant_id },
      select: ['id', 'brand_id'],
    });

    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant #${createCategoryDto.restaurant_id} not found`,
      );
    }

    const saved = await this.categoryRepository.createAndSave({
      ...createCategoryDto,
      brand_id: restaurant.brand_id,
    });
    await this.clearCache(createCategoryDto.restaurant_id);
    return saved;
  }

  async findAllByRestaurant(restaurantId: string): Promise<Category[]> {
    const cacheKey = this.getCacheKey(restaurantId);
    const cached = await this.cacheManager.get<Category[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const categories =
      await this.categoryRepository.findByRestaurantWithItems(restaurantId);
    await this.cacheManager.set(cacheKey, categories);
    return categories;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const saved = await this.categoryRepository.preloadAndSave(
      id,
      updateCategoryDto,
    );

    if (!saved) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    await this.clearCache(saved.restaurant_id);
    return saved;
  }

  async delete(id: string): Promise<void> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    await this.categoryRepository.deleteById(id);
    await this.clearCache(category.restaurant_id);
  }
}
