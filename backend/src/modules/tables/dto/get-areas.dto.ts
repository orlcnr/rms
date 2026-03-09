import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetAreasDto {
  @ApiPropertyOptional({ example: 'Salon' })
  @IsOptional()
  @IsString()
  search?: string;
}
