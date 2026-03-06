import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  RmqOptions,
  Transport,
} from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { OutboxService } from './outbox.service';

@Injectable()
export class OutboxPublisherWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherWorker.name);
  private readonly client: ClientProxy;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly outboxService: OutboxService,
    configService: ConfigService,
  ) {
    const rmqOptions: RmqOptions = {
      transport: Transport.RMQ,
      options: {
        urls: [
          configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
        ],
        queue:
          configService.get<string>('RABBITMQ_INVENTORY_QUEUE') ||
          'inventory_events_queue',
        queueOptions: {
          durable: true,
        },
      },
    };

    this.client = ClientProxyFactory.create(rmqOptions);
  }

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.flushPending();
    }, 3000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async flushPending(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      const events = await this.outboxService.claimBatch(50);
      for (const event of events) {
        try {
          await firstValueFrom(
            this.client.emit(event.event_type, event.payload),
          );
          await this.outboxService.markPublished(event.id);
        } catch (error) {
          await this.outboxService.markFailed(event.id, event.retry_count + 1);
          this.logger.warn(
            `Outbox publish failed for ${event.event_type} (${event.id})`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}
