import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import type { IAuditLog } from './interfaces/audit-log.interface';

@Controller()
export class AuditConsumer {
  private readonly logger = new Logger(AuditConsumer.name);
  private readonly indexName: string;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {
    this.indexName =
      this.configService.get<string>('ELASTICSEARCH_INDEX') || 'audit-logs';
  }

  @EventPattern('audit_log_created')
  async handleAuditLog(@Payload() data: IAuditLog) {
    try {
      await this.elasticsearchService.index({
        index: this.indexName,
        document: data,
      });
    } catch (error) {
      this.logger.error('[ELASTICSEARCH] Error indexing audit log', error);
    }
  }
}
