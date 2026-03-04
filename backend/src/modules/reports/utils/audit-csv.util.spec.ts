import { serializeAuditLogsToCsv } from './audit-csv.util';

describe('serializeAuditLogsToCsv', () => {
  it('should include headers when no rows exist', () => {
    expect(serializeAuditLogsToCsv([])).toBe(
      'timestamp,restaurant_id,user_id,user_name,action,resource,ip_address,user_agent,payload_summary,changes_before_summary,changes_after_summary',
    );
  });

  it('should escape commas, quotes and objects', () => {
    const csv = serializeAuditLogsToCsv([
      {
        timestamp: '2026-03-03T10:00:00.000Z',
        restaurant_id: 'restaurant-1',
        user_id: 'user-1',
        user_name: 'Jane "JJ", Doe',
        action: 'ORDER_UPDATED',
        resource: 'orders',
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
        payload: { amount: 42, notes: 'line1\nline2' },
        changes: {
          before: { status: 'PENDING' },
          after: { status: 'PAID' },
        },
      },
    ]);

    expect(csv).toContain('"Jane ""JJ"", Doe"');
    expect(csv).toContain('"{""amount"":42,""notes"":""line1');
    expect(csv).toContain('"{""status"":""PENDING""}"');
    expect(csv).toContain('"{""status"":""PAID""}"');
  });
});
