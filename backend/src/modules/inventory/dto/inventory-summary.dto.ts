import { ApiProperty } from '@nestjs/swagger';

export class InventorySummaryDto {
  @ApiProperty({ example: 4 })
  criticalStockCount: number;
}
