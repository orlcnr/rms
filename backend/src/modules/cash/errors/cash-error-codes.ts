export const CashErrorCodes = {
  NO_ACTIVE_SESSION: 'CASH_NO_ACTIVE_SESSION',
} as const;

export type CashErrorCode = (typeof CashErrorCodes)[keyof typeof CashErrorCodes];
