import { Injectable, Logger } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  RmqOptions,
  Transport,
} from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IAuditLog } from './interfaces/audit-log.interface';
import { sanitizeAuditObject } from './utils/sanitize-audit.util';

@Injectable()
export class AuditService {
  private client: ClientProxy;
  private readonly logger = new Logger(AuditService.name);

  constructor(private configService: ConfigService) {
    const rmqOptions: RmqOptions = {
      transport: Transport.RMQ,
      options: {
        urls: [
          this.configService.get<string>('RABBITMQ_URL') ||
            'amqp://localhost:5672',
        ],
        queue:
          this.configService.get<string>('RABBITMQ_AUDIT_QUEUE') ||
          'audit_logs_queue',
        queueOptions: {
          durable: true,
        },
      },
    };

    this.client = ClientProxyFactory.create(rmqOptions);
  }

  async emitLog(log: Partial<IAuditLog>): Promise<void> {
    const fullLog: IAuditLog = {
      ...log,
      action: log.action || 'unknown',
      resource: log.resource || 'unknown',
      timestamp: new Date(),
      payload: this.truncateData(log.payload),
      changes: log.changes
        ? {
            ...(log.changes.before !== undefined
              ? { before: this.truncateData(log.changes.before) }
              : {}),
            ...(log.changes.after !== undefined
              ? { after: this.truncateData(log.changes.after) }
              : {}),
            ...(log.changes.meta !== undefined
              ? { meta: this.truncateMeta(log.changes.meta) }
              : {}),
          }
        : undefined,
    };

    try {
      await firstValueFrom(this.client.emit('audit_log_created', fullLog));
      this.logger.log(
        `[AUDIT SERVICE] Audit log başarıyla RMQ'ya gönderildi: ${fullLog.action}`,
      );
    } catch (error) {
      this.logger.error('[AUDIT SERVICE] RMQ Emit hatası:', error);
    }
  }

  async safeEmitLog(log: Partial<IAuditLog>, loggerContext: string) {
    try {
      await this.emitLog(log);
    } catch (error) {
      this.logger.warn(
        `[${loggerContext}] Audit log gönderilemedi: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  markRequestAsAudited(request?: Record<string, unknown>) {
    if (!request) {
      return;
    }
    request.__auditLogged = true;
  }

  private truncateData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    // Basit bir derinlik ve boyut kontrolü
    const sanitizedData = sanitizeAuditObject(data);
    const str = JSON.stringify(sanitizedData);
    if (!str) {
      return sanitizedData;
    }
    const MAX_SIZE = 10240; // 10KB

    if (str.length > MAX_SIZE) {
      return {
        _truncated: true,
        _original_size: str.length,
        _summary: str.substring(0, 1000) + '...',
      };
    }

    return sanitizedData;
  }

  private truncateMeta(meta: unknown): Record<string, unknown> | undefined {
    const truncated = this.truncateData(meta);
    if (
      truncated &&
      typeof truncated === 'object' &&
      !Array.isArray(truncated)
    ) {
      return truncated as Record<string, unknown>;
    }
    return undefined;
  }
}
