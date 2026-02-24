import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

@Injectable()
export class AuditSearchService {
  private readonly logger = new Logger(AuditSearchService.name);
  private readonly indexName: string;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {
    this.indexName =
      this.configService.get<string>('ELASTICSEARCH_INDEX') || 'audit-logs';
  }

  async findAll(filters: GetAuditLogsDto) {
    const {
      page = 1,
      limit = 10,
      restaurant_id,
      user_name,
      action,
      resource,
    } = filters;
    const from = (page - 1) * limit;

    const must: any[] = [];

    if (restaurant_id) {
      must.push({ term: { 'restaurant_id.keyword': restaurant_id } });
    }

    if (user_name) {
      must.push({
        match: { user_name: { query: user_name, operator: 'and' } },
      });
    }

    if (action) {
      must.push({ match: { action: action } });
    }

    if (resource) {
      must.push({ term: { 'resource.keyword': resource } });
    }

    try {
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        from,
        size: limit,
        query: must.length > 0 ? { bool: { must } } : { match_all: {} },
        sort: [{ timestamp: { order: 'desc' } }],
      });

      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      return {
        items: response.hits.hits.map((hit) => ({
          id: hit._id,
          ...(hit._source as any),
        })),
        meta: {
          totalItems: total,
          itemCount: response.hits.hits.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    } catch (error) {
      if (error.meta?.body?.error?.type === 'index_not_found_exception') {
        this.logger.warn(
          `Indeks henüz oluşturulmamış: ${this.indexName}. Boş liste dönülüyor.`,
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
}
