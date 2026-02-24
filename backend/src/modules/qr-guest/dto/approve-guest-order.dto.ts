import { IsOptional, IsString } from 'class-validator';

export class ApproveGuestOrderDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectGuestOrderDto {
  @IsString()
  reason: string;
}
