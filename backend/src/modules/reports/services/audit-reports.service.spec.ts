import { AuditReportsService } from './audit-reports.service';
import { AuditSearchService } from '../../audit/audit-search.service';

describe('AuditReportsService', () => {
  let service: AuditReportsService;
  let auditSearchService: jest.Mocked<
    Pick<AuditSearchService, 'findAll' | 'findForExport'>
  >;

  beforeEach(() => {
    auditSearchService = {
      findAll: jest.fn(),
      findForExport: jest.fn(),
    };

    service = new AuditReportsService(
      auditSearchService as unknown as AuditSearchService,
    );
  });

  it('should always force restaurant scope for list queries', async () => {
    auditSearchService.findAll.mockResolvedValue({
      items: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 0,
        currentPage: 1,
      },
    });

    await service.getAuditLogs('restaurant-1', {
      restaurant_id: 'another-restaurant',
      page: 1,
      limit: 10,
    });

    expect(auditSearchService.findAll).toHaveBeenCalledWith({
      restaurant_id: 'restaurant-1',
      page: 1,
      limit: 10,
    });
  });

  it('should export CSV content with a generated filename', async () => {
    auditSearchService.findForExport.mockResolvedValue([
      {
        timestamp: '2026-03-03T10:00:00.000Z',
        restaurant_id: 'restaurant-1',
        action: 'ORDER_UPDATED',
        resource: 'orders',
      },
    ] as any);

    const result = await service.exportAuditLogsCsv('restaurant-1', {});

    expect(auditSearchService.findForExport).toHaveBeenCalledWith(
      { restaurant_id: 'restaurant-1' },
      10000,
    );
    expect(result.filename).toMatch(/^audit-logs-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.content).toContain(
      'timestamp,restaurant_id,user_id,user_name,action,resource',
    );
  });
});
