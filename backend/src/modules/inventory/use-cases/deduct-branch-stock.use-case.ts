import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Ingredient } from '../entities/ingredient.entity';
import { InventoryEventFactory } from '../events/inventory-event.factory';
import { InventoryEventPublisher } from '../publishers/inventory-event.publisher';
import { toBaseUnit } from '../utils/unit-converter';
import type { DomainEvent } from '../events/inventory-event.types';

export type DeductBranchStockItem = {
  ingredientId: string;
  quantity: number;
  unit: string;
  orderId: string;
};

export type DeductBranchStockResult = {
  ingredientId: string;
  status: 'OK' | 'INSUFFICIENT_STOCK' | 'STOCK_ROW_NOT_FOUND';
  remaining?: number;
};

@Injectable()
export class DeductBranchStockUseCase {
  private readonly logger = new Logger(DeductBranchStockUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventFactory: InventoryEventFactory,
    private readonly eventPublisher: InventoryEventPublisher,
  ) {}

  async execute(
    branchId: string,
    items: DeductBranchStockItem[],
    context?: { brandId?: string; actorId?: string },
  ): Promise<DeductBranchStockResult[]> {
    const eventsToPublish = await this.dataSource.transaction(
      async (manager) => {
        const results: DeductBranchStockResult[] = [];
        const events: Array<{
          event: DomainEvent<Record<string, unknown>>;
          aggregateId: string;
        }> = [];

        for (const item of items) {
          const ingredient = await manager.findOne(Ingredient, {
            where: { id: item.ingredientId },
          });
          if (!ingredient) {
            results.push({
              ingredientId: item.ingredientId,
              status: 'STOCK_ROW_NOT_FOUND',
            });
            continue;
          }

          const baseQty = toBaseUnit(
            item.quantity,
            item.unit,
            Number(ingredient.pack_size) || 1,
          );

          const updatedRows = await manager.query<Array<{ quantity: number }>>(
            `
            UPDATE operations.branch_stocks
            SET quantity = quantity - $1, updated_at = NOW()
            WHERE ingredient_id = $2
              AND branch_id = $3
              AND quantity >= $1
            RETURNING quantity
          `,
            [baseQty, item.ingredientId, branchId],
          );

          if (!updatedRows.length) {
            results.push({
              ingredientId: item.ingredientId,
              status: 'INSUFFICIENT_STOCK',
            });
            const insufficientEvent =
              this.eventFactory.createStockInsufficientEvent({
                brandId: context?.brandId,
                branchId,
                actorId: context?.actorId,
                payload: {
                  orderId: item.orderId,
                  ingredientId: item.ingredientId,
                  requestedBaseQty: baseQty,
                  availableBaseQty: 0,
                  baseUnit: ingredient.base_unit as 'gr' | 'ml' | 'adet',
                  reason: 'INSUFFICIENT_STOCK',
                },
              });
            events.push({
              event: insufficientEvent,
              aggregateId: item.ingredientId,
            });
            continue;
          }

          const remaining = Number(updatedRows[0].quantity);
          results.push({
            ingredientId: item.ingredientId,
            status: 'OK',
            remaining,
          });
          const deductedEvent = this.eventFactory.createStockDeductedEvent({
            brandId: context?.brandId,
            branchId,
            actorId: context?.actorId,
            payload: {
              orderId: item.orderId,
              ingredientId: item.ingredientId,
              deductedBaseQty: baseQty,
              remainingBaseQty: remaining,
              baseUnit: ingredient.base_unit as 'gr' | 'ml' | 'adet',
            },
          });
          events.push({
            event: deductedEvent,
            aggregateId: item.ingredientId,
          });
        }

        return { results, events };
      },
    );

    await Promise.all(
      eventsToPublish.events.map(async ({ event, aggregateId }) => {
        await this.eventPublisher.publish(event, aggregateId).catch((error) => {
          this.logger.warn(
            `Failed to publish inventory event (${event.eventType})`,
            error instanceof Error ? error.stack : String(error),
          );
        });
      }),
    );

    return eventsToPublish.results;
  }
}
