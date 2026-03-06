import { Injectable } from '@nestjs/common';
import { OutboxService } from '../../../common/outbox/outbox.service';
import { DomainEvent } from '../events/inventory-event.types';

@Injectable()
export class InventoryEventPublisher {
  constructor(private readonly outboxService: OutboxService) {}

  async publish<T>(
    event: DomainEvent<T>,
    aggregateId?: string | null,
  ): Promise<void> {
    await this.outboxService.enqueue({
      aggregateType: 'inventory',
      aggregateId: aggregateId ?? null,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      payload: event as unknown as Record<string, unknown>,
    });
  }
}
