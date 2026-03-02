import { ApiProperty } from '@nestjs/swagger';

export class DailyOperationsBucketDto {
  @ApiProperty({ example: '10:30' })
  time: string;

  @ApiProperty({ example: 8 })
  paidOrders: number;

  @ApiProperty({ example: 2450.5 })
  salesAmount: number;

  @ApiProperty({
    example: { cash: 750, credit_card: 1700.5 },
    additionalProperties: { type: 'number' },
  })
  paymentBreakdown: Record<string, number>;
}
