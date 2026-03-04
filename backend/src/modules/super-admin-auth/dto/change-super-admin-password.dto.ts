import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChangeSuperAdminPasswordDto {
  @ApiProperty({ example: 'NewStrongPassword!123' })
  @IsString()
  password: string;
}
