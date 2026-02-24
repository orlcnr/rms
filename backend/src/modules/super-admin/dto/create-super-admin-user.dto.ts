import { IsEmail, IsString, MinLength, MaxLength, IsEnum, IsUUID, IsOptional } from 'class-validator'
import { Transform } from 'class-transformer'
import { IsSafeString } from '../../../common/validators/custom-validators'
import { Role } from '../../../common/enums/role.enum'
import sanitizeHtml from 'sanitize-html'

export class CreateSuperAdminUserDto {
    @IsEmail()
    @Transform(({ value }) => value?.toLowerCase().trim())
    email: string

    @IsString()
    @MinLength(2)
    @MaxLength(50)
    @IsSafeString()
    @Transform(({ value }) => sanitizeHtml(value?.trim() || ''))
    first_name: string

    @IsString()
    @MinLength(2)
    @MaxLength(50)
    @IsSafeString()
    @Transform(({ value }) => sanitizeHtml(value?.trim() || ''))
    last_name: string

    @IsEnum(Role)
    role: Role

    @IsUUID()
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    restaurant_id?: string

    @IsString()
    @MinLength(12)
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    password?: string // Opsiyonel - verilmezse otomatik generate edilir
}
