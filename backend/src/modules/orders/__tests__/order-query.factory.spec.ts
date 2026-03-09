import { OrderQueryFactory } from '../query/factories/order-query.factory';

describe('OrderQueryFactory', () => {
  const factory = new OrderQueryFactory();

  it('creates specs for all supported filters', () => {
    const specs = factory.create({
      status: 'pending,ready',
      waiterId: '11111111-1111-1111-1111-111111111111',
      type: 'dine_in',
      tableId: '22222222-2222-2222-2222-222222222222',
      page: 1,
      limit: 20,
    });

    expect(specs).toHaveLength(4);
  });

  it('returns empty list when no filters are provided', () => {
    const specs = factory.create({
      page: 1,
      limit: 20,
    });

    expect(specs).toHaveLength(0);
  });
});
