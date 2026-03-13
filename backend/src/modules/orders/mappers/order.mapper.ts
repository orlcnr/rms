import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderItemResponseDto } from '../dto/order-item-response.dto';
import { OrderResponseDto } from '../dto/order-response.dto';

export class OrderMapper {
  static toItemDto(item: OrderItem): OrderItemResponseDto {
    return {
      id: item.id,
      order_id: item.orderId,
      menu_item_id: item.menuItemId,
      quantity: Number(item.quantity || 0),
      unit_price_locked:
        item.unitPriceLocked !== null && item.unitPriceLocked !== undefined
          ? Number(item.unitPriceLocked)
          : null,
      subtotal: Number(item.totalPrice || 0),
      status: item.status,
      send_to_kitchen: Boolean(item.sendToKitchen),
      menu_item: item.menuItem
        ? {
            id: item.menuItem.id,
            name: item.menuItem.name,
            price: Number(item.menuItem.price || 0),
            image_url: item.menuItem.image_url || undefined,
          }
        : undefined,
    };
  }

  static toDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
      restaurant_id: order.restaurantId,
      table_id: order.tableId,
      user_id: order.userId,
      status: order.status,
      type: order.type,
      source: order.source,
      pickup_type: order.pickupType,
      pickup_time: order.pickupTime,
      delivery_status: order.deliveryStatus,
      delivery_address: order.deliveryAddress,
      delivery_phone: order.deliveryPhone,
      customer_name: order.customerName,
      total_amount: Number(order.totalAmount || 0),
      order_number: order.orderNumber,
      merged_into: order.mergedInto,
      table: order.table
        ? {
            id: order.table.id,
            name: order.table.name,
            area:
              typeof order.table.area === 'string'
                ? order.table.area
                : order.table.area?.name || undefined,
          }
        : null,
      customer: order.customer
        ? {
            id: order.customer.id,
            first_name: order.customer.first_name || undefined,
            last_name: order.customer.last_name || undefined,
            name: `${order.customer.first_name || ''} ${
              order.customer.last_name || ''
            }`.trim(),
          }
        : null,
      items: (order.items || []).map((item) => this.toItemDto(item)),
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }
}
