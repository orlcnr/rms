import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateDeactivateUserDto {
    @ApiProperty({ example: true, description: 'Set to true to activate, false to deactivate' })
    @IsBoolean()
    is_active: boolean;
}
