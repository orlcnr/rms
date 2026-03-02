import { ApiProperty } from '@nestjs/swagger';

export class RevenueTrendDto {
  @ApiProperty({ example: '2026-03-01' })
  date: string;

  @ApiProperty({ example: 8450.25 })
  amount: number;
}
