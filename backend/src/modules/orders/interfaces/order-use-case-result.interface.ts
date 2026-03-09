import type { OrderErrorCode } from '../errors/order-error-codes';

export type OrderUseCaseFailure = {
  ok: false;
  code: OrderErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type OrderUseCaseSuccess<T> = {
  ok: true;
  value: T;
};

export type OrderUseCaseResult<T> =
  | OrderUseCaseSuccess<T>
  | OrderUseCaseFailure;
