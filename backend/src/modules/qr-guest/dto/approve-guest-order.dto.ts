import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ApproveGuestOrderDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectGuestOrderDto {
  @Transform(({ value }): string =>
    typeof value === 'string' ? value.trim() : '',
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  reason: string;
}
