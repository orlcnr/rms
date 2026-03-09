import { Injectable } from '@nestjs/common';
import { TableQrService } from '../services/table-qr.service';

@Injectable()
export class GenerateTableQrPdfUseCase {
  constructor(private readonly tableQrService: TableQrService) {}

  execute(
    tableId: string,
    restaurantId: string,
    restaurantName?: string,
  ): Promise<Buffer> {
    return this.tableQrService.generateSingleQrPdf(
      tableId,
      restaurantId,
      restaurantName,
    );
  }
}
