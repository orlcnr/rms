import { Order, OrderGroup } from '@/modules/orders/types'

export type PrintFormat = 'receipt_80mm' | 'a4'

export type PrintableOrderInput = OrderGroup | Order

export interface OrderPrintMeta {
  printedAt: string
  restaurantName?: string
}
