import { SessionHistoryQueryFactory } from '../query/factories/session-history-query.factory';
import { CashSessionStatus } from '../enums/cash.enum';
import { SessionHistoryDateRangeSpec } from '../query/specs/session-history/session-history-date-range.spec';
import { CashSession } from '../entities/cash-session.entity';
import { SelectQueryBuilder } from 'typeorm';

describe('SessionHistoryQueryFactory', () => {
  it('should always include scope + date range specs', () => {
    const factory = new SessionHistoryQueryFactory();
    const specs = factory.create(
      { page: 1, limit: 10 },
      { restaurantId: 'r-1' },
    );

    expect(specs.length).toBe(2);
  });

  it('should append register/status/openedBy specs when filters are set', () => {
    const factory = new SessionHistoryQueryFactory();
    const specs = factory.create(
      {
        registerId: 'reg-1',
        status: CashSessionStatus.OPEN,
        openedById: 'user-1',
        page: 1,
        limit: 10,
      },
      { restaurantId: 'r-1' },
    );

    expect(specs.length).toBe(5);
  });
});

describe('SessionHistoryDateRangeSpec', () => {
  it('should throw when date range is over 31 days', () => {
    const spec = new SessionHistoryDateRangeSpec('2026-01-01', '2026-02-15');
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
    } as unknown as SelectQueryBuilder<CashSession>;

    expect(() => spec.apply(qb)).toThrow('31 günden fazla olamaz');
  });
});
