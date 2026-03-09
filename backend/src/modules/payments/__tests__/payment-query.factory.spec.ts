import { PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { PaymentQueryFactory } from '../query/factories/payment-query.factory';

describe('PaymentQueryFactory', () => {
  it('should include scope by default', () => {
    const factory = new PaymentQueryFactory();
    const specs = factory.create({}, { restaurantId: 'rest-1' });
    expect(specs.length).toBe(1);
  });

  it('should include optional filters when provided', () => {
    const factory = new PaymentQueryFactory();
    const specs = factory.create(
      {
        search: 'ORD',
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        startDate: '2026-03-01',
        endDate: '2026-03-08',
        orderId: 'order-1',
      },
      { restaurantId: 'rest-1' },
    );

    expect(specs.length).toBe(6);
  });
});
