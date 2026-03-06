export type InventoryEventType =
  | 'inventory.stock.deducted'
  | 'inventory.stock.insufficient'
  | 'inventory.stock.initialized'
  | 'inventory.ingredient.created'
  | 'inventory.stock.mismatch_detected';

export type DomainEvent<T> = {
  eventId: string;
  eventType: InventoryEventType;
  eventVersion: 1;
  occurredAt: string;
  correlationId?: string;
  causationId?: string;
  actorId?: string;
  brandId?: string;
  branchId?: string;
  payload: T;
};

export type StockDeductedPayload = {
  orderId: string;
  ingredientId: string;
  deductedBaseQty: number;
  remainingBaseQty: number;
  baseUnit: 'gr' | 'ml' | 'adet';
};

export type StockInsufficientPayload = {
  orderId?: string;
  ingredientId: string;
  requestedBaseQty: number;
  availableBaseQty: number;
  baseUnit: 'gr' | 'ml' | 'adet';
  reason: 'INSUFFICIENT_STOCK' | 'STOCK_ROW_NOT_FOUND';
};
