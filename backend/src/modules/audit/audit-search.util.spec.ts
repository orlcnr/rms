import { buildAuditSearchQuery } from './audit-search.util';

describe('buildAuditSearchQuery', () => {
  it('should return match_all when no filters are given', () => {
    expect(buildAuditSearchQuery({})).toEqual({ match_all: {} });
  });

  it('should build term, match and range clauses', () => {
    expect(
      buildAuditSearchQuery({
        restaurant_id: 'restaurant-1',
        user_name: 'Jane Doe',
        action: 'ORDER_UPDATED',
        resource: 'orders',
        start_date: '2026-03-01T00:00:00.000Z',
        end_date: '2026-03-03T23:59:59.999Z',
      }),
    ).toEqual({
      bool: {
        must: [
          { term: { 'restaurant_id.keyword': 'restaurant-1' } },
          {
            match: {
              user_name: {
                operator: 'and',
                query: 'Jane Doe',
              },
            },
          },
          { match: { action: 'ORDER_UPDATED' } },
          { term: { 'resource.keyword': 'orders' } },
          {
            range: {
              timestamp: {
                gte: '2026-03-01T00:00:00.000Z',
                lte: '2026-03-03T23:59:59.999Z',
              },
            },
          },
        ],
      },
    });
  });
});
