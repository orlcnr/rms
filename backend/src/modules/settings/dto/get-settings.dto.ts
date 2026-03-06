import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const SETTING_GROUPS = ['payment', 'cash', 'general'] as const;

export class GetSettingsDto {
  @ApiPropertyOptional({ example: 'payment', enum: SETTING_GROUPS })
  @IsOptional()
  @IsIn(SETTING_GROUPS)
  group?: (typeof SETTING_GROUPS)[number];

  @ApiPropertyOptional({
    example: true,
    description: 'Return settings with metadata (type/group) when true',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeMeta?: boolean;
}
