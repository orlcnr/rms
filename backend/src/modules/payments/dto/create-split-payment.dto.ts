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
  tip_amount?: number;

  @ApiPropertyOptional({ example: 3.0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  commission_rate?: number;
}

export class CreateSplitPaymentDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({ type: [PaymentTransactionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentTransactionDto)
  payments: PaymentTransactionDto[];

  @ApiPropertyOptional({ enum: DiscountType })
  @IsEnum(DiscountType)
  @IsOptional()
  discount_type?: DiscountType;

  @ApiPropertyOptional({ example: 'Doğum günü indirimi' })
  @IsString()
  @IsOptional()
  discount_reason?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discount_amount?: number;
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
