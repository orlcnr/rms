import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxEvent } from './outbox.entity';

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepository: Repository<OutboxEvent>,
  ) {}

  async enqueue(params: {
    aggregateType: string;
    aggregateId?: string | null;
    eventType: string;
    eventVersion?: number;
    payload: Record<string, unknown>;
  }): Promise<OutboxEvent> {
    return this.outboxRepository.save(
      this.outboxRepository.create({
        aggregate_type: params.aggregateType,
        aggregate_id: params.aggregateId ?? null,
        event_type: params.eventType,
        event_version: params.eventVersion ?? 1,
        payload: params.payload,
        status: 'pending',
        retry_count: 0,
      }),
    );
  }

  async claimBatch(limit = 50): Promise<OutboxEvent[]> {
    return this.outboxRepository
      .createQueryBuilder('outbox')
      .where('outbox.status = :status', { status: 'pending' })
      .andWhere(
        '(outbox.next_retry_at IS NULL OR outbox.next_retry_at <= :now)',
        { now: new Date() },
      )
      .orderBy('outbox.created_at', 'ASC')
      .limit(limit)
      .getMany();
  }

  async markPublished(id: string): Promise<void> {
    await this.outboxRepository.update(id, {
      status: 'published',
      published_at: new Date(),
      next_retry_at: null,
    });
  }

  async markFailed(id: string, retryCount: number): Promise<void> {
    const nextRetryMs = Math.min(2 ** retryCount * 1000, 5 * 60 * 1000);
    await this.outboxRepository.update(id, {
      status: 'pending',
      retry_count: retryCount,
      next_retry_at: new Date(Date.now() + nextRetryMs),
    });
  }
}
