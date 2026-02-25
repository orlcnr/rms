import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, DiscountType } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({ example: 50.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiPropertyOptional({ example: 'TX123456' })
  @IsString()
  @IsOptional()
  transaction_id?: string;

  @ApiPropertyOptional({ example: 10.0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discount_amount?: number;

  @ApiPropertyOptional({ example: 'discount', enum: DiscountType })
  @IsEnum(DiscountType)
  @IsOptional()
  discount_type?: DiscountType;

  @ApiPropertyOptional({ example: 'Payment note' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-of-user' })
  @IsUUID()
  @IsOptional()
  user_id?: string;

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
