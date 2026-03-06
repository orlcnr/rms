import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Ingredient } from '../entities/ingredient.entity';

@Injectable()
export class IngredientRepository {
  constructor(
    @InjectRepository(Ingredient)
    private readonly repository: Repository<Ingredient>,
  ) {}

  createFindAllQuery(branchId: string): SelectQueryBuilder<Ingredient> {
    void branchId;
    return this.repository
      .createQueryBuilder('ingredient')
      .leftJoinAndSelect('ingredient.stock', 'stock');
  }

  async findOneInScope(params: {
    id: string;
    restaurantId?: string;
    brandId?: string | null;
  }): Promise<Ingredient | null> {
    const { id, restaurantId, brandId } = params;

    if (brandId) {
      return this.repository.findOne({
        where: { id, brand_id: brandId },
        relations: ['stock'],
      });
    }

    if (restaurantId) {
      return this.repository.findOne({
        where: { id, restaurant_id: restaurantId },
        relations: ['stock'],
      });
    }

    return this.repository.findOne({
      where: { id },
      relations: ['stock'],
    });
  }

  async findByIdWithStock(id: string): Promise<Ingredient | null> {
    return this.repository.findOne({ where: { id }, relations: ['stock'] });
  }

  async save(entity: Ingredient): Promise<Ingredient> {
    return this.repository.save(entity);
  }

  async softRemove(entity: Ingredient): Promise<Ingredient> {
    return this.repository.softRemove(entity);
  }
}
