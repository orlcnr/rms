import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetSettingsDto {
  @ApiPropertyOptional({ example: 'payment' })
  @IsOptional()
  @IsString()
  group?: string;
}
