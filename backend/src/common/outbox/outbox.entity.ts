import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../entities/base.entity';

export type OutboxStatus = 'pending' | 'published' | 'failed';

@Entity('outbox_events', { schema: 'operations' })
@Index('idx_outbox_pending', ['status', 'next_retry_at', 'created_at'])
export class OutboxEvent extends BaseEntity {
  @Column()
  aggregate_type: string;

  @Column({ type: 'uuid', nullable: true })
  aggregate_id: string | null;

  @Column()
  event_type: string;

  @Column({ type: 'integer', default: 1 })
  event_version: number;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ default: 'pending' })
  status: OutboxStatus;

  @Column({ type: 'integer', default: 0 })
  retry_count: number;

  @Column({ type: 'timestamp', nullable: true })
  next_retry_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date | null;
}
