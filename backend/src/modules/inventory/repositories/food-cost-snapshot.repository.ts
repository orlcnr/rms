import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodCostSnapshot } from '../entities/food-cost-snapshot.entity';

type SnapshotAlert = {
  product_id: string;
  product_name: string;
  current_price: number;
  recipe_cost: number;
  food_cost_percent: number;
  suggested_price: number;
};

@Injectable()
export class FoodCostSnapshotRepository {
  constructor(
    @InjectRepository(FoodCostSnapshot)
    private readonly repository: Repository<FoodCostSnapshot>,
  ) {}

  async findByBranchAndDate(
    branchId: string,
    snapshotDate: string,
  ): Promise<FoodCostSnapshot | null> {
    return this.repository.findOne({
      where: {
        branch_id: branchId,
        snapshot_date: snapshotDate,
      },
    });
  }

  async hasAnySnapshotForDate(snapshotDate: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { snapshot_date: snapshotDate },
    });
    return count > 0;
  }

  async upsertSnapshot(params: {
    branchId: string;
    snapshotDate: string;
    alerts: SnapshotAlert[];
    computedAt: Date;
  }): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(FoodCostSnapshot)
      .values({
        branch_id: params.branchId,
        snapshot_date: params.snapshotDate,
        alerts: params.alerts,
        computed_at: params.computedAt,
      })
      .onConflict(
        `("branch_id", "snapshot_date") DO UPDATE SET "alerts" = EXCLUDED."alerts", "computed_at" = EXCLUDED."computed_at", "updated_at" = NOW()`,
      )
      .execute();
  }
}
