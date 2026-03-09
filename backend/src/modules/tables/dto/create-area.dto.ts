import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAreaDto {
  @ApiProperty({ example: 'Garden' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
