import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UuidParamDto {
  @ApiProperty({
    format: 'uuid',
    description: 'UUID v4 identifier',
  })
  @IsUUID('4', { message: 'Invalid UUID format' })
  id: string;
}
