import { IsString, IsOptional, MinLength, Matches } from 'class-validator'

export class UpdateUserPasswordDto {
    @IsString()
    @IsOptional()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password is too weak. Must contain uppercase, lowercase, numbers or symbols.',
    })
    password?: string
}
