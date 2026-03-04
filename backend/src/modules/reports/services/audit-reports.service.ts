import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { AuditSearchService } from '../../audit/audit-search.service';
import { ExportAuditLogsDto } from '../../audit/dto/export-audit-logs.dto';
import { GetAuditLogsDto } from '../../audit/dto/get-audit-logs.dto';
import { serializeAuditLogsToCsv } from '../utils/audit-csv.util';

@Injectable()
export class AuditReportsService {
  constructor(private readonly auditSearchService: AuditSearchService) {}

  async getAuditLogs(restaurantId: string, query: GetAuditLogsDto) {
    return this.auditSearchService.findAll({
      ...query,
      restaurant_id: restaurantId,
    });
  }

  async exportAuditLogsCsv(restaurantId: string, query: ExportAuditLogsDto) {
    const items = await this.auditSearchService.findForExport(
      {
        ...query,
        restaurant_id: restaurantId,
      },
      10000,
    );

    return {
      filename: `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      content: serializeAuditLogsToCsv(items),
    };
  }
}
