import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SettingType } from '../entities/restaurant-setting.entity';

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
  value: any;

  @ApiProperty({ enum: SettingType })
  @IsEnum(SettingType)
  type: SettingType;

  @ApiPropertyOptional({ example: 'payment' })
  @IsOptional()
  @IsString()
  group?: string;
}
