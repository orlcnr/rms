import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMethod, DiscountType } from '../entities/payment.entity';

export class PaymentTransactionDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiPropertyOptional({ example: 'uuid-of-customer' })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cash_received?: number;

  @ApiPropertyOptional({ example: 'Nakit üzeri' })
  @IsString()
  @IsOptional()
  notes?: string;

  // Bahşiş alanları
  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10000) // Makul bir üst limit
  tip_amount?: number;

  @ApiPropertyOptional({ example: 3.0 })
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ example: 3.0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1) // %100'den fazla komisyon olamaz
  commission_rate?: number;

  @ApiPropertyOptional({ example: 'Payment note' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'TX123456' })
  @IsString()
  @IsOptional()
  transaction_id?: string;
}

export class CreateSplitPaymentDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({ type: [PaymentTransactionDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'En az bir ödeme yöntemi belirtilmelidir' })
  @ValidateNested({ each: true })
  @Type(() => PaymentTransactionDto)
  payments: PaymentTransactionDto[];

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  discount_type?: string;

  @ApiPropertyOptional({ example: 'Doğum günü indirimi' })
  @IsString()
  @IsOptional()
  discount_reason?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discount_amount?: number;

  @ApiPropertyOptional({ example: 'uuid-v4-transaction-id' })
  @IsString()
  @IsOptional()
  transaction_id?: string;
}

export class RevertPaymentDto {
  @ApiProperty({ example: 'uuid-of-payment' })
  @IsUUID()
  @IsNotEmpty()
  payment_id: string;

  @ApiProperty({ example: 'Yanlış ödeme yöntemi seçildi' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: 'uuid-of-admin' })
  @IsUUID()
  @IsOptional()
  approved_by?: string;
}
