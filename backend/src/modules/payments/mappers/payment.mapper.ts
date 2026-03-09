import { Payment } from '../entities/payment.entity';
import { PaymentResponseDto } from '../dto/payment-response.dto';

export class PaymentMapper {
  static toResponse(entity: Payment): PaymentResponseDto {
    return {
      id: entity.id,
      restaurant_id: entity.restaurant_id,
      order_id: entity.order_id,
      order_number: entity.order?.orderNumber || null,
      table_name: entity.order?.table?.name || null,
      customer_id: entity.customer_id,
      amount: Number(entity.amount),
      final_amount: Number(entity.final_amount),
      payment_method: entity.payment_method,
      status: entity.status,
      transaction_id: entity.transaction_id,
      description: entity.description,
      discount_type: entity.discount_type,
      discount_amount: Number(entity.discount_amount),
      tip_amount: entity.tip_amount != null ? Number(entity.tip_amount) : null,
      commission_rate:
        entity.commission_rate != null ? Number(entity.commission_rate) : null,
      net_tip_amount:
        entity.net_tip_amount != null ? Number(entity.net_tip_amount) : null,
      created_at: entity.created_at.toISOString(),
    };
  }
}
