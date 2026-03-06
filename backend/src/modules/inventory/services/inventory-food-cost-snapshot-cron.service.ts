import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InventoryAnalysisService } from './inventory-analysis.service';

@Injectable()
export class InventoryFoodCostSnapshotCronService {
  constructor(
    private readonly inventoryAnalysisService: InventoryAnalysisService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Cron('0 3 * * *', { timeZone: 'Europe/Istanbul' })
  async handleDailySnapshot(): Promise<void> {
    await this.inventoryAnalysisService.runDailyFoodCostSnapshotCron();
  }
}
