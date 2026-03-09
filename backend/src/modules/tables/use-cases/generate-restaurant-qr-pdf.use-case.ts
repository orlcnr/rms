import { Injectable } from '@nestjs/common';
import { TableQrService } from '../services/table-qr.service';

@Injectable()
export class GenerateRestaurantQrPdfUseCase {
  constructor(private readonly tableQrService: TableQrService) {}

  execute(restaurantId: string, restaurantName?: string): Promise<Buffer> {
    return this.tableQrService.generateBulkQrPdf(
      restaurantId,
      restaurantName || 'Restaurant',
    );
  }
}
