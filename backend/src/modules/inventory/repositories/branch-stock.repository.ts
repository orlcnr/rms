import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchStock } from '../entities/branch-stock.entity';

@Injectable()
export class BranchStockRepository {
  constructor(
    @InjectRepository(BranchStock)
    private readonly repository: Repository<BranchStock>,
  ) {}

  async findByBranchAndIngredients(
    branchId: string,
    ingredientIds: string[],
  ): Promise<Map<string, BranchStock>> {
    if (!ingredientIds.length) {
      return new Map();
    }

    const rows = await this.repository.find({
      where: ingredientIds.map((ingredientId) => ({
        branch_id: branchId,
        ingredient_id: ingredientId,
      })),
    });

    return new Map(rows.map((row) => [row.ingredient_id, row]));
  }
}
