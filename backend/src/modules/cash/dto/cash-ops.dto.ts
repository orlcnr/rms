import { IsBoolean } from 'class-validator';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CashMovementSubtype, CashMovementType } from '../enums/cash.enum';
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
  notes?: string;

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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  creditCardTotal?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  distributeCardTips?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  cardTipsToDistribute?: number;
}

export class CreateCashMovementDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  cash_register_id?: string;

  @ApiProperty({ enum: CashMovementType })
  @IsEnum(CashMovementType)
  type: CashMovementType;

  @ApiProperty({ enum: CashMovementSubtype, required: false })
  @IsEnum(CashMovementSubtype)
  @IsOptional()
  subtype?: CashMovementSubtype;

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

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isVoid?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isTip?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isOpeningBalance?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isClosingDifference?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isManualCashIn?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isManualCashOut?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  is_payment?: boolean;
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
