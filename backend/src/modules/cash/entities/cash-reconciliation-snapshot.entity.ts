import { Entity, Column, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CashSession } from './cash-session.entity';

@Entity('cash_reconciliation_snapshots', { schema: 'operations' })
@Index('uq_cash_reconciliation_snapshots_session_id', ['sessionId'], {
  unique: true,
})
@Index('idx_cash_reconciliation_snapshots_restaurant_session', [
  'restaurantId',
  'sessionId',
])
export class CashReconciliationSnapshot extends BaseEntity {
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => CashSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: CashSession;

  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId: string;

  @Column({ name: 'report', type: 'jsonb' })
  report: unknown;

  @Column({ name: 'computed_at', type: 'timestamptz' })
  computedAt: Date;
}
