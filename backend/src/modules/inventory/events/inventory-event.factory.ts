import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DomainEvent,
  InventoryEventType,
  StockDeductedPayload,
  StockInsufficientPayload,
} from './inventory-event.types';

@Injectable()
export class InventoryEventFactory {
  createStockDeductedEvent(params: {
    brandId?: string;
    branchId: string;
    actorId?: string;
    payload: StockDeductedPayload;
  }): DomainEvent<StockDeductedPayload> {
    return this.createEnvelope('inventory.stock.deducted', params);
  }

  createStockInsufficientEvent(params: {
    brandId?: string;
    branchId: string;
    actorId?: string;
    payload: StockInsufficientPayload;
  }): DomainEvent<StockInsufficientPayload> {
    return this.createEnvelope('inventory.stock.insufficient', params);
  }

  createStockInitializedEvent(params: {
    brandId: string;
    branchId: string;
    actorId?: string;
    payload: {
      branchId: string;
      brandId: string;
      initializedCount: number;
    };
  }): DomainEvent<{
    branchId: string;
    brandId: string;
    initializedCount: number;
  }> {
    return this.createEnvelope('inventory.stock.initialized', params);
  }

  createIngredientCreatedEvent(params: {
    brandId: string;
    actorId?: string;
    payload: { ingredientId: string; name: string; baseUnit: string };
  }): DomainEvent<{ ingredientId: string; name: string; baseUnit: string }> {
    return this.createEnvelope('inventory.ingredient.created', {
      ...params,
      branchId: undefined,
    });
  }

  private createEnvelope<T>(
    eventType: InventoryEventType,
    params: {
      brandId?: string;
      branchId?: string;
      actorId?: string;
      payload: T;
    },
  ): DomainEvent<T> {
    return {
      eventId: randomUUID(),
      eventType,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      actorId: params.actorId,
      brandId: params.brandId,
      branchId: params.branchId,
      payload: params.payload,
    };
  }
}
