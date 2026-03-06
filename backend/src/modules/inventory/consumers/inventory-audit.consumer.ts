import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { sanitizeAuditObject } from '../../audit/utils/sanitize-audit.util';
import type { DomainEvent } from '../events/inventory-event.types';

@Controller()
export class InventoryAuditConsumer {
  private readonly logger = new Logger(InventoryAuditConsumer.name);

  constructor(private readonly auditService: AuditService) {}

  @EventPattern('inventory.stock.deducted')
  async onStockDeducted(
    @Payload() event: DomainEvent<Record<string, unknown>>,
  ) {
    await this.auditService.safeEmitLog(
      {
        action: AuditAction.INVENTORY_STOCK_MOVEMENT_ADDED,
        resource: 'INVENTORY',
        restaurant_id: event.branchId,
        payload: sanitizeAuditObject(event.payload),
      },
      'InventoryAuditConsumer.onStockDeducted',
    );
  }

  @EventPattern('inventory.stock.insufficient')
  async onStockInsufficient(
    @Payload() event: DomainEvent<Record<string, unknown>>,
  ) {
    await this.auditService.safeEmitLog(
      {
        action: AuditAction.INVENTORY_STOCK_BULK_UPDATED,
        resource: 'INVENTORY',
        restaurant_id: event.branchId,
        changes: {
          meta: sanitizeAuditObject(event.payload),
        },
      },
      'InventoryAuditConsumer.onStockInsufficient',
    );
  }

  @EventPattern('inventory.stock.initialized')
  async onStockInitialized(
    @Payload() event: DomainEvent<Record<string, unknown>>,
  ) {
    this.logger.log(
      `Branch stock initialized event received: ${event.eventId} (${event.branchId})`,
    );
  }
}
