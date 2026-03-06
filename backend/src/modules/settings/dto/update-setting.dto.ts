import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SettingType } from '../entities/restaurant-setting.entity';

const SETTING_GROUPS = ['payment', 'cash', 'general'] as const;

export class UpdateSettingDto {
  @ApiProperty({ example: 'tip_commission_rate' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: 0.02,
    description: 'Value can be number, string, or boolean',
  })
  @IsNotEmpty()
  value: unknown;

  @ApiProperty({ enum: SettingType })
  @IsEnum(SettingType)
  type: SettingType;

  @ApiPropertyOptional({ example: 'payment', enum: SETTING_GROUPS })
  @IsOptional()
  @IsIn(SETTING_GROUPS)
  group?: (typeof SETTING_GROUPS)[number];
}
