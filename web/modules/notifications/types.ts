export type NotificationType =
  | 'new_order'
  | 'order_status'
  | 'guest_order'
  | 'waiter_call'
  | 'bill_request'
  | 'system'

export interface Notification {
  id: string
  restaurantId: string
  userId?: string | null
  title: string
  message: string
  type: NotificationType
  data?: Record<string, unknown> | null
  isRead: boolean
  created_at: string
  updated_at: string
}

export interface NotificationsMeta {
  totalItems: number
  itemCount: number
  itemsPerPage: number
  totalPages: number
  currentPage: number
}

export interface NotificationsResponse {
  items: Notification[]
  meta: NotificationsMeta
}

export interface GetNotificationsParams {
  page?: number
  limit?: number
  isRead?: boolean
  type?: NotificationType
}

