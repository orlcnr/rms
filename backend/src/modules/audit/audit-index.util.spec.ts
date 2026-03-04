import { getWeeklyAuditIndexName } from './audit-index.util';

describe('getWeeklyAuditIndexName', () => {
  it('should format the current ISO week with padding', () => {
    expect(getWeeklyAuditIndexName(new Date('2026-03-03T12:00:00.000Z'))).toBe(
      'audit-logs-2026-w10',
    );
  });

  it('should keep single digit weeks zero padded', () => {
    expect(getWeeklyAuditIndexName(new Date('2026-01-05T12:00:00.000Z'))).toBe(
      'audit-logs-2026-w02',
    );
  });

  it('should use the ISO week year around year boundaries', () => {
    expect(getWeeklyAuditIndexName(new Date('2027-01-01T12:00:00.000Z'))).toBe(
      'audit-logs-2026-w53',
    );
  });
});
