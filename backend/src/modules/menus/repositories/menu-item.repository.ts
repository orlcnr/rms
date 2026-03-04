import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeepPartial,
  EntityManager,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { MenuItem } from '../entities/menu-item.entity';

@Injectable()
export class MenuItemRepository {
  constructor(
    @InjectRepository(MenuItem)
    private readonly repo: Repository<MenuItem>,
  ) {}

  create(data: DeepPartial<MenuItem>): MenuItem {
    return this.repo.create(data);
  }

  async createAndSave(
    data: DeepPartial<MenuItem>,
    manager?: EntityManager,
  ): Promise<MenuItem> {
    const repository = manager ? manager.getRepository(MenuItem) : this.repo;
    return repository.save(repository.create(data));
  }

  async save(item: MenuItem, manager?: EntityManager): Promise<MenuItem> {
    const repository = manager ? manager.getRepository(MenuItem) : this.repo;
    return repository.save(item);
  }

  async deleteById(id: string, manager?: EntityManager): Promise<void> {
    const repository = manager ? manager.getRepository(MenuItem) : this.repo;
    await repository.delete(id);
  }

  async findById(id: string): Promise<MenuItem | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdWithCategory(id: string): Promise<MenuItem | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['category'],
    });
  }

  async findByIdWithRelations(id: string): Promise<MenuItem | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['category', 'recipes', 'recipes.ingredient'],
    });
  }

  async findByIdsWithRelations(ids: string[]): Promise<MenuItem[]> {
    if (!ids.length) {
      return [];
    }

    return this.repo.find({
      where: { id: In(ids) },
      relations: [
        'category',
        'recipes',
        'recipes.ingredient',
        'recipes.ingredient.stock',
      ],
    });
  }

  async findByCategoryWithRelations(categoryId: string): Promise<MenuItem[]> {
    return this.repo.find({
      where: { category_id: categoryId },
      relations: ['recipes', 'recipes.ingredient'],
    });
  }

  createRestaurantItemsQuery(): SelectQueryBuilder<MenuItem> {
    return this.repo
      .createQueryBuilder('item')
      .innerJoin('item.category', 'category')
      .leftJoin('item.recipes', 'recipes')
      .leftJoin('recipes.ingredient', 'ingredient')
      .leftJoin('ingredient.stock', 'stock');
  }
}
