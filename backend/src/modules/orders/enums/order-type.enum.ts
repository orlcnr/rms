export enum OrderType {
  DINE_IN = 'dine_in',
  COUNTER = 'counter',
  /** @deprecated legacy alias, mapped to counter during transition */
  TAKEAWAY = 'takeaway',
  DELIVERY = 'delivery',
}
