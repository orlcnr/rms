import { IsOptional, IsString } from 'class-validator';

export class SubmitOrderDto {
  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
