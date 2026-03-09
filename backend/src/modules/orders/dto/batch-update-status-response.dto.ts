import { OrderResponseDto } from './order-response.dto';

export class BatchUpdateStatusFailedItemDto {
  /**
   * @source input.order_ids[n]
   * @context sales|admin|audit
   * @nullable Hayır
   */
  order_id: string;

  /**
   * @source orders/errors/order-error-codes.ts
   * @context sales|admin|audit
   * @nullable Hayır
   */
  code: string;

  /**
   * @source domain/use-case validation message
   * @context sales|admin
   * @nullable Hayır
   */
  message: string;
}

export class BatchUpdateStatusResponseDto {
  /**
   * @source business.orders WHERE id IN updatedOrderIds
   * @context sales|admin
   * @nullable Hayır
   */
  updated: OrderResponseDto[];

  /**
   * @source use-case failed result list
   * @context sales|admin|audit
   * @nullable Hayır
   */
  failed: BatchUpdateStatusFailedItemDto[];

  /**
   * @source failed.length > 0 && updated.length > 0
   * @context sales|admin
   * @nullable Hayır
   */
  isPartial: boolean;
}
