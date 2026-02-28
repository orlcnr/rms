import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CashMovementType } from '../enums/cash.enum';
import { PaymentMethod } from '../../payments/entities/payment.entity';

export class CreateCashRegisterDto {
  @ApiProperty()
  @IsString()
  name: string;
}

export class OpenCashSessionDto {
  @ApiProperty()
  @IsUUID()
  cashRegisterId: string;

  @ApiProperty()
  @IsNumber()
  openingBalance: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  transaction_id?: string;
}

export class CloseCashSessionDto {
  @ApiProperty()
  @IsNumber()
  countedBalance: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  transaction_id?: string;
}

export class CreateCashMovementDto {
  @ApiProperty({ enum: CashMovementType })
  @IsEnum(CashMovementType)
  type: CashMovementType;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  transaction_id?: string;
}

export class RegisterIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  registerId: string;
}

export class SessionIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId: string;
}
