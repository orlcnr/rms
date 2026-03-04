'use client'

import { Notification } from './types'

export const NOTIFICATION_READ_EVENT = 'notifications:read'
export const NOTIFICATIONS_READ_ALL_EVENT = 'notifications:read-all'

export interface NotificationReadEventDetail {
  id: string
  source?: string
}

export interface NotificationsReadAllEventDetail {
  source?: string
}

interface GuestOrderNotificationData {
  orderId?: string
  tableId?: string
  tableName?: string
}

export function parseGuestOrderData(
  value: Notification['data'],
): GuestOrderNotificationData | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>

  return {
    orderId:
      typeof candidate.orderId === 'string' ? candidate.orderId : undefined,
    tableId:
      typeof candidate.tableId === 'string' ? candidate.tableId : undefined,
    tableName:
      typeof candidate.tableName === 'string' ? candidate.tableName : undefined,
  }
}

export function getNotificationActionHref(notification: Notification): string | null {
  const guestOrderData =
    notification.type === 'guest_order'
      ? parseGuestOrderData(notification.data)
      : null

  const rawData =
    notification.data && typeof notification.data === 'object'
      ? (notification.data as Record<string, unknown>)
      : null

  const tableId =
    guestOrderData?.tableId ||
    (typeof rawData?.tableId === 'string' ? rawData.tableId : undefined)

  if (notification.type === 'guest_order' && guestOrderData?.orderId) {
    const params = new URLSearchParams({
      open: 'guest-approvals',
      focus: guestOrderData.orderId,
      notificationId: notification.id,
    })

    return `/orders?${params.toString()}`
  }

  if (
    (notification.type === 'waiter_call' || notification.type === 'bill_request') &&
    tableId
  ) {
    const params = new URLSearchParams({
      focus: tableId,
      notificationId: notification.id,
    })

    return `/tables?${params.toString()}`
  }

  return null
}

export function emitNotificationRead(id: string, source?: string) {
  window.dispatchEvent(
    new CustomEvent<NotificationReadEventDetail>(NOTIFICATION_READ_EVENT, {
      detail: { id, source },
    }),
  )
}

export function emitNotificationsReadAll(source?: string) {
  window.dispatchEvent(
    new CustomEvent<NotificationsReadAllEventDetail>(NOTIFICATIONS_READ_ALL_EVENT, {
      detail: { source },
    }),
  )
}
