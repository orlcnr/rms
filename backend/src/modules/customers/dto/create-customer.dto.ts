import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Ahmet' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ example: 'Yılmaz' })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ example: '5551234567' })
  @IsString()
  @IsNotEmpty()
  // Simple regex for digits, can be enhanced based on requirements
  @Matches(/^[0-9+\-\s()]*$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiPropertyOptional({ example: 'ahmet@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'No onions' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: ['VIP', 'Friendly'] })
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 0, description: 'Müşteri kredi limiti' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  credit_limit?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Kredi limiti kontrolü aktif mi',
  })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  credit_limit_enabled?: boolean;

  @ApiPropertyOptional({
    example: 5,
    description: 'Maksimum açık sipariş sayısı',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  max_open_orders?: number;
}
