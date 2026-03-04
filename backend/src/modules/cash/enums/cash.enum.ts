export enum CashSessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum CashMovementType {
  SALE = 'sale',
  IN = 'in',
  OUT = 'out',
}

export enum CashMovementSubtype {
  REGULAR = 'regular',
  TIP = 'tip',
  REFUND = 'refund',
  EXPENSE = 'expense',
  ADJUSTMENT = 'adjustment',
}
