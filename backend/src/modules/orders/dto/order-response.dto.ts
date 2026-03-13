import { OrderStatus } from '../enums/order-status.enum';
import { OrderType } from '../enums/order-type.enum';
import { OrderSource } from '../enums/order-source.enum';
import { PickupType } from '../enums/pickup-type.enum';
import { DeliveryStatus } from '../enums/delivery-status.enum';
import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderResponseDto {
  /**
   * @source business.orders.id
   * @context sales|admin|audit
   * @nullable Hayır
   */
  id: string;

  /**
   * @source business.orders.restaurant_id
   * @context audit|scope
   * @nullable Hayır
   */
  restaurant_id: string;

  /**
   * @source business.orders.table_id
   * @context sales — dine-in masa bağlamı
   * @nullable Evet — takeout/delivery veya merge source order
   */
  table_id: string | null;

  /**
   * @source business.orders.user_id
   * @context admin|audit
   * @nullable Evet
   */
  user_id: string | null;

  /**
   * @source business.orders.status
   * @context sales|kitchen|audit
   * @nullable Hayır
   */
  status: OrderStatus;

  /**
   * @source business.orders.type
   * @context sales|admin
   * @nullable Hayır
   */
  type: OrderType;

  /**
   * @source business.orders.source
   * @context sales|integration
   * @nullable Hayır
   */
  source: OrderSource;

  /**
   * @source business.orders.pickup_type
   * @context counter-flow
   * @nullable Evet
   */
  pickup_type?: PickupType | null;

  /**
   * @source business.orders.pickup_time
   * @context counter-flow
   * @nullable Evet
   */
  pickup_time?: Date | null;

  /**
   * @source business.orders.delivery_status
   * @context delivery-flow
   * @nullable Evet
   */
  delivery_status?: DeliveryStatus | null;

  /**
   * @source business.orders.delivery_address
   * @context delivery-flow
   * @nullable Evet
   */
  delivery_address?: string | null;

  /**
   * @source business.orders.delivery_phone
   * @context delivery-flow
   * @nullable Evet
   */
  delivery_phone?: string | null;

  /**
   * @source business.orders.customer_name
   * @context counter|delivery
   * @nullable Evet
   */
  customer_name?: string | null;

  /**
   * @source business.orders.total_amount
   * @context sales|admin
   * @nullable Hayır
   */
  total_amount: number;

  /**
   * @source business.orders.order_number
   * @context sales|admin
   * @nullable Evet
   */
  order_number: string | null;

  /**
   * @source business.orders.merged_into
   * @context audit|support
   * @nullable Evet — merge olmayan siparişlerde null
   */
  merged_into: string | null;

  /**
   * @source business.tables (orders.table relation)
   * @context sales|board
   * @nullable Evet
   */
  table?: {
    id: string;
    name: string;
    area?: string;
  } | null;

  /**
   * @source business.customers (orders.customer relation)
   * @context sales|board
   * @nullable Evet
   */
  customer?: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
  } | null;

  /**
   * @source business.order_items WHERE order_id = orders.id
   * @context sales|admin
   * @nullable Hayır — boş olabilir ama dizi döner
   */
  items: OrderItemResponseDto[];

  created_at: Date;
  updated_at: Date;
}
