import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { InventoryEventFactory } from '../events/inventory-event.factory';
import { InventoryEventPublisher } from '../publishers/inventory-event.publisher';

@Injectable()
export class InitBranchStockUseCase {
  private readonly logger = new Logger(InitBranchStockUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventFactory: InventoryEventFactory,
    private readonly eventPublisher: InventoryEventPublisher,
  ) {}

  async execute(
    branchId: string,
    brandId: string,
    options?: { manager?: EntityManager },
  ): Promise<number> {
    const executor = options?.manager ?? this.dataSource;
    const rawResult: unknown = await executor.query(
      `
      INSERT INTO operations.branch_stocks (ingredient_id, branch_id, quantity)
      SELECT i.id, $1, 0
      FROM operations.ingredients i
      WHERE i.brand_id = $2
      ON CONFLICT (ingredient_id, branch_id) DO NOTHING
      RETURNING id
      `,
      [branchId, brandId],
    );
    const initializedCount = Array.isArray(rawResult) ? rawResult.length : 0;

    const event = this.eventFactory.createStockInitializedEvent({
      branchId,
      brandId,
      payload: {
        branchId,
        brandId,
        initializedCount,
      },
    });
    await this.eventPublisher.publish(event, branchId).catch((error) => {
      this.logger.warn(
        `Failed to publish inventory event (${event.eventType})`,
        error instanceof Error ? error.stack : String(error),
      );
    });

    return initializedCount;
  }
}
