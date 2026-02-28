import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class SearchUserDto {
  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: Role, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ description: 'Filter by restaurant ID' })
  @IsOptional()
  @IsUUID()
  restaurant_id?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_active?: boolean;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
