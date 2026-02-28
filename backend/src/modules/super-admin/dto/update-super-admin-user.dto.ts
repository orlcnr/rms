import { PartialType } from '@nestjs/mapped-types';
import { CreateSuperAdminUserDto } from './create-super-admin-user.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSuperAdminUserDto extends PartialType(
  CreateSuperAdminUserDto,
) {
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
