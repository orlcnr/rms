export interface GuestCatalogItem {
  id: string
  name: string
  description?: string | null
  price: number
  base_price?: number
  effective_price?: number
  image_url?: string | null
  is_available: boolean
  popularity?: number
}

export type GuestTabKey = 'menu' | 'orders' | 'cart' | 'account'

export interface GuestCatalogCategory {
  id: string
  name: string
  description?: string | null
  items: GuestCatalogItem[]
}

export interface GuestOrderItem {
  menuItemId: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
}

export interface GuestOrder {
  id: string
  sessionId: string
  tableId: string
  status: string
  items: GuestOrderItem[]
  notes?: string | null
  totalAmount: number
  submittedAt?: string | null
  rejectedReason?: string | null
  linkedOrderStatus?: string | null
  created_at?: string
  updated_at?: string
}

export interface GuestSessionView {
  id: string
  restaurantId: string
  restaurantName?: string
  tableId: string
  tableName?: string
  googleCommentUrl?: string
  displayName?: string
  status: string
  createdAt: string
  expiresAt: string
  lastActivityAt: string
}

export interface GuestTableBill {
  items: Array<{
    name: string
    quantity: number
    subtotal: number
    status: string
  }>
  totalAmount: number
}

export interface GuestRequestState {
  waiterNextAllowedAt: string | null
  billNextAllowedAt: string | null
  serverTime: string
}

export interface GuestTableGuestOrderSummaryItem {
  name: string
  quantity: number
  subtotal: number
}

export interface GuestTableGuestOrderSummary {
  otherSessionsTotalAmount: number
  otherSessionsItemCount: number
  otherSessionsOrdersCount: number
  previewItems: GuestTableGuestOrderSummaryItem[]
  lastUpdatedAt?: string
}

export interface GuestBootstrapResponse {
  serverTime: string
  session: GuestSessionView
  restaurant: {
    id: string
    name: string
    googleCommentUrl?: string
  }
  table: {
    id: string
    name: string
  }
  displayName: string | null
  catalog: GuestCatalogCategory[]
  activeDraftOrder: GuestOrder | null
  sessionOrders: GuestOrder[]
  tableOrderedMenuItemIds: string[]
  tableGuestOrderSummary: GuestTableGuestOrderSummary
  tableBill: GuestTableBill
  requestState: GuestRequestState
}

export interface GuestSessionCreateResponse {
  guestAccessToken: string
  session: GuestSessionView
}

export interface GuestBasketItem {
  menuItemId: string
  name: string
  unitPrice: number
  quantity: number
}

export interface GuestRequestAck<T> {
  accepted: boolean
  deduped: boolean
  nextAllowedAt: string
  serverTime: string
  request: T
}

export interface PendingGuestApprovalItem {
  id: string
  sessionId: string
  tableId: string
  totalAmount: number
  notes?: string | null
  submittedAt?: string | null
  rejectedReason?: string | null
  items: GuestOrderItem[]
  table?: {
    id: string
    name: string
  }
}
