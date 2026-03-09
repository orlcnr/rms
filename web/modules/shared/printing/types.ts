import { Order, OrderGroup } from '@/modules/orders/types'

export type PrintFormat = 'receipt_80mm' | 'receipt_58mm' | 'a4' | 'label_4x6'
export type PrintPurpose = 'adisyon' | 'mutfak' | 'rapor'

export interface PrinterProfile {
  id: string
  name: string
  format: PrintFormat
  guidance?: string
  isActive: boolean
  updatedAt: string
}

export interface PrinterProfilesSettingV1 {
  version: 1
  profiles: PrinterProfile[]
  defaultProfileId?: string
}

export type PrintableOrderInput = OrderGroup | Order

export interface OrderPrintMeta {
  printedAt: string
  restaurantName?: string
}
