import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
