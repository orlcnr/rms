import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Recipe } from '../../inventory/entities/recipe.entity';

interface RecipeInput {
  ingredient_id: string;
  quantity: number;
}

@Injectable()
export class RecipeRepository {
  constructor(
    @InjectRepository(Recipe)
    private readonly repo: Repository<Recipe>,
  ) {}

  createManyForProduct(productId: string, recipes: RecipeInput[]): Recipe[] {
    return recipes.map((recipe) =>
      this.repo.create({
        product_id: productId,
        ingredient_id: recipe.ingredient_id,
        quantity: recipe.quantity,
      }),
    );
  }

  async replaceForProduct(
    productId: string,
    recipes: RecipeInput[],
    manager: EntityManager,
  ): Promise<void> {
    const repository = manager.getRepository(Recipe);
    await repository.delete({ product_id: productId });

    if (!recipes.length) {
      return;
    }

    await repository.save(this.createManyForProduct(productId, recipes));
  }

  async deleteByProductId(
    productId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager ? manager.getRepository(Recipe) : this.repo;
    await repository.delete({ product_id: productId });
  }
}
