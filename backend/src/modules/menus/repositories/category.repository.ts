import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  create(data: DeepPartial<Category>): Category {
    return this.repo.create(data);
  }

  async createAndSave(data: DeepPartial<Category>): Promise<Category> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdWithRestaurant(id: string): Promise<Category | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['restaurant'],
    });
  }

  async findByRestaurantWithItems(restaurantId: string): Promise<Category[]> {
    return this.repo.find({
      where: { restaurant_id: restaurantId },
      relations: ['items', 'items.recipes', 'items.recipes.ingredient'],
    });
  }

  async preloadAndSave(
    id: string,
    data: Partial<Category>,
  ): Promise<Category | null> {
    const entity = await this.repo.preload({ id, ...data });

    if (!entity) {
      return null;
    }

    return this.repo.save(entity);
  }

  async save(category: Category): Promise<Category> {
    return this.repo.save(category);
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
