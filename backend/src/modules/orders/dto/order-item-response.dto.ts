import { OrderStatus } from '../enums/order-status.enum';

export class OrderItemResponseDto {
  /**
   * @source business.order_items.id
   * @context sales|admin|audit
   * @nullable Hayır
   */
  id: string;

  /**
   * @source business.order_items.order_id
   * @context sales|admin|audit
   * @nullable Hayır
   */
  order_id: string;

  /**
   * @source business.order_items.menu_item_id
   * @context sales|admin|audit
   * @nullable Hayır
   */
  menu_item_id: string;

  /**
   * @source business.order_items.quantity
   * @context sales|admin
   * @nullable Hayır
   */
  quantity: number;

  /**
   * @source business.order_items.unit_price_locked
   * @context sales — sipariş anı kilitli fiyat
   * @nullable Evet — legacy satırlarda null olabilir
   */
  unit_price_locked: number | null;

  /**
   * @source business.order_items.subtotal
   * @context sales|admin
   * @nullable Hayır
   */
  subtotal: number;

  /**
   * @source business.order_items.status
   * @context sales|kitchen|audit
   * @nullable Hayır
   */
  status: OrderStatus;

  /**
   * @source business.menu_items (items.menuItem relation)
   * @context sales|kitchen
   * @nullable Evet — legacy satırlarda menü kaydı bulunmayabilir
   */
  menu_item?: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
  };
}
