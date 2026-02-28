import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  IsSafeString,
  IsSlug,
} from '../../../common/validators/custom-validators';
import sanitizeHtml from 'sanitize-html';

export class CreateSA_RestaurantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsSafeString()
  @Transform(({ value }) => sanitizeHtml(value?.trim() || ''))
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsSlug()
  @Transform(({ value }) => value?.toLowerCase().trim())
  slug: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  @IsSafeString()
  @Transform(({ value }) => {
    const sanitized = sanitizeHtml(value?.trim() || '');
    return sanitized === '' ? undefined : sanitized;
  })
  description?: string;

  @IsString()
  @MaxLength(500)
  @IsSafeString()
  @Transform(({ value }) => sanitizeHtml(value?.trim() || ''))
  address: string;

  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  contact_email: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  @Transform(({ value }) => {
    const val = value?.trim();
    return val === '' ? undefined : val;
  })
  contact_phone?: string;

  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  owner_email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsSafeString()
  @Transform(({ value }) => sanitizeHtml(value?.trim() || ''))
  owner_first_name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsSafeString()
  @Transform(({ value }) => sanitizeHtml(value?.trim() || ''))
  owner_last_name: string;

  @IsUrl()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  google_comment_url?: string;
}
