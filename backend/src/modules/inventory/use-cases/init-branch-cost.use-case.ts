import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class InitBranchCostUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    branchId: string,
    brandId: string,
    options?: { manager?: EntityManager },
  ): Promise<number> {
    const executor = options?.manager ?? this.dataSource;
    const rawResult: unknown = await executor.query(
      `
      INSERT INTO operations.branch_ingredient_costs (
        ingredient_id,
        branch_id,
        average_cost,
        last_price,
        previous_price,
        price_updated_at
      )
      SELECT i.id, $1, NULL, NULL, NULL, NULL
      FROM operations.ingredients i
      WHERE i.brand_id = $2
      ON CONFLICT (ingredient_id, branch_id) DO NOTHING
      RETURNING id
      `,
      [branchId, brandId],
    );

    return Array.isArray(rawResult) ? rawResult.length : 0;
  }
}
