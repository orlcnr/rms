export const PaymentErrorCodes = {
  PAYMENT_ALREADY_REFUNDED: 'PAYMENT_ALREADY_REFUNDED',
  INVALID_REFUND_METHOD: 'INVALID_REFUND_METHOD',
  PAYMENT_REFUND_NOT_ALLOWED_FOR_OPEN_ACCOUNT:
    'PAYMENT_REFUND_NOT_ALLOWED_FOR_OPEN_ACCOUNT',
} as const;

export type PaymentErrorCode =
  (typeof PaymentErrorCodes)[keyof typeof PaymentErrorCodes];
