import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'My Awesome Burger Joint' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'my-awesome-burger-joint',
    description: 'URL friendly identifier',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase kebab-case',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'Best burgers in town' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '123 Main St, Food City' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: 'contact@burgerjoint.com' })
  @IsEmail()
  @IsOptional()
  contact_email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  contact_phone?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/yourrestaurant' })
  @IsString()
  @IsOptional()
  instagram_url?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/yourrestaurant' })
  @IsString()
  @IsOptional()
  facebook_url?: string;

  @ApiPropertyOptional({ example: 'https://twitter.com/yourrestaurant' })
  @IsString()
  @IsOptional()
  twitter_url?: string;

  @ApiPropertyOptional({ example: 'https://yourrestaurant.com' })
  @IsString()
  @IsOptional()
  website_url?: string;

  // opening_hours could be a specific nested DTO, keeping it free JSON for now or simple struct
  @ApiPropertyOptional()
  @IsOptional()
  opening_hours?: Record<string, any>;

  @ApiPropertyOptional({ example: 'https://g.page/r/your-id/review' })
  @IsString()
  @IsOptional()
  google_comment_url?: string;
}
