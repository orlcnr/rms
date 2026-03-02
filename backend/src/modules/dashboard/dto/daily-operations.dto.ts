import { ApiProperty } from '@nestjs/swagger';
import { DailyOperationsBucketDto } from './daily-operations-bucket.dto';

export class DailyOperationsDto {
  @ApiProperty({ example: '2026-03-01' })
  date: string;

  @ApiProperty({ example: 14 })
  currentOpenTables: number;

  @ApiProperty({ example: 42 })
  closedPaidOrdersToday: number;

  @ApiProperty({ example: 18750.9 })
  dailySalesAmount: number;

  @ApiProperty({ example: 4200 })
  openOrdersAmount: number;

  @ApiProperty({
    example: { cash: 3500, credit_card: 15250.9 },
    additionalProperties: { type: 'number' },
  })
  paymentTotals: Record<string, number>;

  @ApiProperty({ type: [DailyOperationsBucketDto] })
  series: DailyOperationsBucketDto[];
}
