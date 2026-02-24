import { Injectable, Logger } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { IAuditLog } from './interfaces/audit-log.interface';

@Injectable()
export class AuditService {
  private client: ClientProxy;
  private readonly logger = new Logger(AuditService.name);

  constructor(private configService: ConfigService) {
    this.client = ClientProxyFactory.create({
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
    } as any);
  }

  async emitLog(log: Partial<IAuditLog>) {
    const fullLog: IAuditLog = {
      ...log,
      action: log.action || 'unknown',
      resource: log.resource || 'unknown',
      timestamp: new Date(),
      payload: this.truncateData(log.payload),
      changes: log.changes
        ? {
            before: this.truncateData(log.changes.before),
            after: this.truncateData(log.changes.after),
          }
        : undefined,
    };

    try {
      console.log(
        '[AUDIT SERVICE] Emit ediliyor:',
        JSON.stringify(fullLog, null, 2),
      );
      this.client.emit('audit_log_created', fullLog);
      this.logger.log(
        `[AUDIT SERVICE] Audit log başarıyla RMQ'ya gönderildi: ${fullLog.action}`,
      );
    } catch (error) {
      this.logger.error('[AUDIT SERVICE] RMQ Emit hatası:', error);
      console.error('[AUDIT SERVICE] Hata detayı:', error);
    }
  }

  private truncateData(data: any): any {
    if (!data) return data;

    // Basit bir derinlik ve boyut kontrolü
    const str = JSON.stringify(data);
    const MAX_SIZE = 10240; // 10KB

    if (str.length > MAX_SIZE) {
      return {
        _truncated: true,
        _original_size: str.length,
        _summary: str.substring(0, 1000) + '...',
      };
    }

    return data;
  }
}
