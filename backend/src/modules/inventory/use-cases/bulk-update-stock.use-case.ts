import { BadRequestException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { AuditService } from '../../audit/audit.service';
import { sanitizeAuditChanges } from '../../audit/utils/sanitize-audit.util';
import type { User } from '../../users/entities/user.entity';
import { Ingredient } from '../entities/ingredient.entity';
import { BranchStock } from '../entities/branch-stock.entity';
import { Stock } from '../entities/stock.entity';
import { MovementType, StockMovement } from '../entities/stock-movement.entity';

export type BulkUpdateResult = {
  updated: Array<{ ingredientId: string; newQty: number }>;
  failed: Array<{ ingredientId: string; reason: string }>;
};

@Injectable()
export class BulkUpdateStockUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  private buildActorName(actor?: User): string | undefined {
    if (!actor?.first_name) {
      return undefined;
    }
    return `${actor.first_name} ${actor.last_name || ''}`.trim();
  }

  async execute(
    updates: { ingredientId: string; newQuantity: number }[],
    actor?: User,
    request?: Request,
  ): Promise<BulkUpdateResult> {
    const branchId = actor?.restaurant_id;
    if (!branchId) {
      throw new BadRequestException('Restaurant ID is required');
    }

    const result: BulkUpdateResult = {
      updated: [],
      failed: [],
    };

    for (const update of updates) {
      try {
        await this.dataSource.transaction(async (manager) => {
          const ingredient = await manager.findOne(Ingredient, {
            where: { id: update.ingredientId },
          });
          if (!ingredient) {
            throw new BadRequestException('Ingredient not found');
          }

          const stock = await manager.findOne(Stock, {
            where: { ingredient_id: update.ingredientId },
          });

          const previousQuantity = Number(stock?.quantity ?? 0);
          const nextQuantity = Number(update.newQuantity);
          const difference = nextQuantity - previousQuantity;

          if (!stock) {
            await manager.save(Stock, {
              ingredient_id: update.ingredientId,
              quantity: nextQuantity,
            });
          } else {
            stock.quantity = nextQuantity;
            await manager.save(Stock, stock);
          }

          await manager.query(
            `
            INSERT INTO operations.branch_stocks (ingredient_id, branch_id, quantity)
            VALUES ($1, $2, 0)
            ON CONFLICT (ingredient_id, branch_id) DO NOTHING
            `,
            [update.ingredientId, branchId],
          );

          const branchStock = await manager.findOne(BranchStock, {
            where: {
              ingredient_id: update.ingredientId,
              branch_id: branchId,
            },
          });

          if (!branchStock) {
            throw new BadRequestException('Branch stock not found');
          }

          branchStock.quantity = nextQuantity;
          await manager.save(BranchStock, branchStock);

          if (difference !== 0) {
            const movementType =
              difference > 0 ? MovementType.IN : MovementType.OUT;
            const quantity = Math.abs(difference);
            const unit = ingredient.base_unit || ingredient.unit || 'adet';

            await manager.save(StockMovement, {
              ingredient_id: update.ingredientId,
              quantity,
              type: movementType,
              reason: 'SAYIM FARKI - Hızlı Sayım',
              branch_id: branchId,
              unit,
              base_quantity: quantity,
            });
          }
        });

        result.updated.push({
          ingredientId: update.ingredientId,
          newQty: update.newQuantity,
        });
      } catch (error: unknown) {
        const reason =
          error instanceof Error ? error.message : 'Unexpected error';
        result.failed.push({
          ingredientId: update.ingredientId,
          reason,
        });
      }
    }

    const headerUserAgent = request?.headers?.['user-agent'];
    const userAgent =
      typeof headerUserAgent === 'string'
        ? headerUserAgent
        : headerUserAgent?.[0];

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.INVENTORY_STOCK_BULK_UPDATED,
        resource: 'INVENTORY',
        user_id: actor?.id,
        user_name: this.buildActorName(actor),
        restaurant_id: branchId,
        changes: sanitizeAuditChanges({
          after: {
            operation: 'bulk_update_stock',
            itemCount: updates.length,
            successCount: result.updated.length,
            failedCount: result.failed.length,
            updated: result.updated,
            failed: result.failed,
          },
        }),
        ip_address: request?.ip,
        user_agent: userAgent,
      },
      'BulkUpdateStockUseCase.execute',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return result;
  }
}
