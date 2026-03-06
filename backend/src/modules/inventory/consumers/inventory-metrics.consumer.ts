import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type { DomainEvent } from '../events/inventory-event.types';

@Controller()
export class InventoryMetricsConsumer {
  private readonly logger = new Logger(InventoryMetricsConsumer.name);

  @EventPattern('inventory.stock.deducted')
  async onStockDeducted(
    @Payload() event: DomainEvent<Record<string, unknown>>,
  ) {
    this.logger.debug(
      `inventory.stock.deducted: ${event.eventId} branch=${event.branchId}`,
    );
  }

  @EventPattern('inventory.stock.insufficient')
  async onStockInsufficient(
    @Payload() event: DomainEvent<Record<string, unknown>>,
  ) {
    this.logger.debug(
      `inventory.stock.insufficient: ${event.eventId} branch=${event.branchId}`,
    );
  }
}
