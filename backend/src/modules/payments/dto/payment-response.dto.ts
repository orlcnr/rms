import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '../entities/payment.entity';

export class PaymentResponseDto {
  /** @source operations.payments.id */
  @ApiProperty()
  id: string;

  /** @source operations.payments.restaurant_id */
  @ApiProperty()
  restaurant_id: string;

  /** @source operations.payments.order_id */
  @ApiProperty()
  order_id: string;

  /** @source operations.orders.order_number @nullable true */
  @ApiPropertyOptional({ nullable: true })
  order_number: string | null;

  /** @source business.tables.name @nullable true */
  @ApiPropertyOptional({ nullable: true })
  table_name: string | null;

  /** @source operations.payments.customer_id @nullable true */
  @ApiPropertyOptional({ nullable: true })
  customer_id: string | null;

  /** @source operations.payments.amount */
  @ApiProperty()
  amount: number;

  /** @source operations.payments.final_amount */
  @ApiProperty()
  final_amount: number;

  /** @source operations.payments.payment_method */
  @ApiProperty({ enum: PaymentMethod })
  payment_method: PaymentMethod;

  /** @source operations.payments.status */
  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  /** @source operations.payments.transaction_id @nullable true */
  @ApiPropertyOptional({ nullable: true })
  transaction_id: string | null;

  /** @source operations.payments.description @nullable true */
  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  /** @source operations.payments.discount_type @nullable true */
  @ApiPropertyOptional({ nullable: true })
  discount_type: string | null;

  /** @source operations.payments.discount_amount */
  @ApiProperty()
  discount_amount: number;

  /** @source operations.payments.tip_amount @nullable true */
  @ApiPropertyOptional({ nullable: true })
  tip_amount: number | null;

  /** @source operations.payments.commission_rate @nullable true */
  @ApiPropertyOptional({ nullable: true })
  commission_rate: number | null;

  /** @source operations.payments.net_tip_amount @nullable true */
  @ApiPropertyOptional({ nullable: true })
  net_tip_amount: number | null;

  /** @source operations.payments.created_at */
  @ApiProperty()
  created_at: string;
}

export class PaymentListResponseDto {
  /** @context paginated payment history items */
  @ApiProperty({ type: [PaymentResponseDto] })
  items: PaymentResponseDto[];
}

export class SplitPaymentResponseDto {
  /** @context split payment created lines */
  @ApiProperty({ type: [PaymentResponseDto] })
  payments: PaymentResponseDto[];

  /** @context change amount after split payment */
  @ApiProperty()
  change: number;
}
