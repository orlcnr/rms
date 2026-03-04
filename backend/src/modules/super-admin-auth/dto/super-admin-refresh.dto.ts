import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SuperAdminRefreshDto {
  @ApiPropertyOptional({
    description: 'Optional explicit refresh token. Cookie transport is preferred.',
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
