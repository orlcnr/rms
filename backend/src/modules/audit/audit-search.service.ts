import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ExportAuditLogsDto } from './dto/export-audit-logs.dto';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { buildAuditSearchQuery } from './audit-search.util';
import { AUDIT_INDEX_PATTERN, AUDIT_READ_ALIAS } from './audit-index.util';

@Injectable()
export class AuditSearchService {
  private readonly logger = new Logger(AuditSearchService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async findAll(filters: GetAuditLogsDto) {
    const { page = 1, limit = 10 } = filters;
    const from = (page - 1) * limit;
    const query = buildAuditSearchQuery(filters);

    try {
      const response = await this.searchWithFallback({
        from,
        size: limit,
        query,
        sort: [{ timestamp: { order: 'desc' } }],
      });
      const hits = response.hits.hits as Array<{
        _id: string;
        _source?: Record<string, unknown>;
      }>;

      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      return {
        items: hits.map((hit) => ({
          id: hit._id,
          ...(hit._source || {}),
        })),
        meta: {
          totalItems: total,
          itemCount: hits.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    } catch (error) {
      if (this.isIndexMissingError(error)) {
        this.logger.warn(
          `Audit alias mevcut degil: ${AUDIT_READ_ALIAS}. Bos liste donuluyor.`,
        );
      } else {
        this.logger.error('Error searching audit logs in Elasticsearch', error);
      }

      return {
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: limit,
          totalPages: 0,
          currentPage: page,
        },
      };
    }
  }

  async findForExport(filters: ExportAuditLogsDto, maxRows = 10000) {
    const query = buildAuditSearchQuery(filters);

    try {
      const response = await this.searchWithFallback({
        size: maxRows,
        query,
        sort: [{ timestamp: { order: 'desc' } }],
      });
      const hits = response.hits.hits as Array<{
        _id: string;
        _source?: Record<string, unknown>;
      }>;

      return hits.map((hit) => ({
        id: hit._id,
        ...(hit._source || {}),
      }));
    } catch (error) {
      if (this.isIndexMissingError(error)) {
        this.logger.warn(
          `Audit alias mevcut degil: ${AUDIT_READ_ALIAS}. Export icin bos liste donuluyor.`,
        );
        return [];
      }

      this.logger.error('Error exporting audit logs from Elasticsearch', error);
      return [];
    }
  }

  private isIndexMissingError(error: unknown): boolean {
    const errorType = this.getElasticsearchErrorType(error);

    return (
      errorType === 'index_not_found_exception' ||
      errorType === 'alias_not_found_exception'
    );
  }

  private getElasticsearchErrorType(error: unknown): string | undefined {
    const candidate = error as {
      meta?: {
        body?: {
          error?: {
            type?: string;
          };
        };
      };
    };

    return candidate.meta?.body?.error?.type;
  }

  private async searchWithFallback(
    params: Record<string, unknown>,
  ): Promise<Awaited<ReturnType<ElasticsearchService['search']>>> {
    try {
      return await this.elasticsearchService.search({
        index: AUDIT_READ_ALIAS,
        ...params,
      });
    } catch (error) {
      if (!this.isIndexMissingError(error)) {
        throw error;
      }

      this.logger.warn(
        `Audit alias mevcut degil: ${AUDIT_READ_ALIAS}. Fiziksel index pattern ile devam ediliyor.`,
      );

      return this.elasticsearchService.search({
        index: AUDIT_INDEX_PATTERN,
        ...params,
      });
    }
  }
}
