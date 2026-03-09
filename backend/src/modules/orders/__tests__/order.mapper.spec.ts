import { OrderMapper } from '../mappers/order.mapper';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderType } from '../enums/order-type.enum';
import { OrderSource } from '../enums/order-source.enum';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';

describe('OrderMapper', () => {
  it('maps order entity to response dto', () => {
    const item = Object.assign(new OrderItem(), {
      id: 'item-1',
      orderId: 'order-1',
      menuItemId: 'menu-1',
      quantity: 2,
      unitPriceLocked: 61.725,
      totalPrice: 123.45,
      status: OrderStatus.PENDING,
    });

    const order = Object.assign(new Order(), {
      id: 'order-1',
      restaurantId: 'rest-1',
      tableId: 'table-1',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      type: OrderType.DINE_IN,
      source: OrderSource.INTERNAL,
      totalAmount: 123.45,
      orderNumber: 'ORD-123',
      mergedInto: null,
      created_at: new Date('2026-03-08T10:00:00.000Z'),
      updated_at: new Date('2026-03-08T10:05:00.000Z'),
      items: [item],
    });

    const mapped = OrderMapper.toDto(order);

    expect(mapped.id).toBe('order-1');
    expect(mapped.total_amount).toBe(123.45);
    expect(mapped.items).toHaveLength(1);
    expect(mapped.items[0].menu_item_id).toBe('menu-1');
  });
});
