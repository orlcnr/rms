import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import type { IAuditLog } from './interfaces/audit-log.interface';
import { AUDIT_READ_ALIAS, getWeeklyAuditIndexName } from './audit-index.util';

@Controller()
export class AuditConsumer {
  private readonly logger = new Logger(AuditConsumer.name);
  private activeIndexName: string | null = null;

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  @EventPattern('audit_log_created')
  async handleAuditLog(@Payload() data: IAuditLog) {
    const indexName = getWeeklyAuditIndexName();

    try {
      await this.ensureIndexExists(indexName);

      await this.elasticsearchService.index({
        index: indexName,
        document: data,
      });
    } catch (error) {
      this.logger.error('[ELASTICSEARCH] Error indexing audit log', error);
    }
  }

  private async ensureIndexExists(indexName: string) {
    if (this.activeIndexName === indexName) {
      return;
    }

    try {
      const exists = await this.elasticsearchService.indices.exists({
        index: indexName,
      });

      if (!exists) {
        await this.elasticsearchService.indices.create({
          index: indexName,
          aliases: {
            [AUDIT_READ_ALIAS]: {},
          },
        });
        this.logger.log(
          `[ELASTICSEARCH] Weekly audit index initialized: ${indexName}`,
        );
      }

      this.activeIndexName = indexName;
    } catch (error) {
      const errorType = this.getElasticsearchErrorType(error);

      if (errorType === 'resource_already_exists_exception') {
        this.activeIndexName = indexName;
        return;
      }

      throw error;
    }
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
}
