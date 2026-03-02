import { ApiProperty } from '@nestjs/swagger';

export class DashboardKpiDto {
  @ApiProperty({ example: 12500.5 })
  dailyNetSales: number;

  @ApiProperty({ example: 12.5 })
  dailySalesChange: number;

  @ApiProperty({ example: 18 })
  activeOrders: number;

  @ApiProperty({ example: 8 })
  activeOrdersPending: number;

  @ApiProperty({ example: 86 })
  tableOccupancyRate: number;

  @ApiProperty({ example: 40 })
  totalTables: number;

  @ApiProperty({ example: 34 })
  occupiedTables: number;

  @ApiProperty({ example: 5 })
  criticalStockCount: number;
}
