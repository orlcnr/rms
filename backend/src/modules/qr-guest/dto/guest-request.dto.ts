import { IsOptional, IsString } from 'class-validator';

export class WaiterCallDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  urgency?: 'low' | 'medium' | 'high';
}

export class BillRequestDto {
  @IsOptional()
  @IsString()
  paymentMethod?: 'cash' | 'card' | 'split';

  @IsOptional()
  @IsString()
  notes?: string;
}
