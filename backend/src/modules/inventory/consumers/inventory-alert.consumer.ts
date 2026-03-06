import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type { DomainEvent } from '../events/inventory-event.types';

@Controller()
export class InventoryAlertConsumer {
  private readonly logger = new Logger(InventoryAlertConsumer.name);

  @EventPattern('inventory.stock.insufficient')
  async onStockInsufficient(
    @Payload() event: DomainEvent<Record<string, unknown>>,
  ) {
    this.logger.warn(
      `Insufficient stock event: ${event.eventId} branch=${event.branchId}`,
    );
  }
}
