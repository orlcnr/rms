import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetSettingsDto {
  @ApiPropertyOptional({ example: 'payment' })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Return settings with metadata (type/group) when true',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeMeta?: boolean;
}
