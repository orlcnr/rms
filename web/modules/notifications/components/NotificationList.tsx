'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, Clock3 } from 'lucide-react'
import { Button } from '@/modules/shared/components/Button'
import { Notification } from '../types'
import {
  getNotificationActionHref,
  parseGuestOrderData,
} from '../utils'

interface NotificationListProps {
  notifications: Notification[]
  isLoading?: boolean
  onMarkAsRead?: (id: string) => Promise<void> | void
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'new_order':
      return 'Yeni Sipariş'
    case 'order_status':
      return 'Sipariş Durumu'
    case 'guest_order':
      return 'Misafir Siparişi'
    case 'waiter_call':
      return 'Garson Çağrısı'
    case 'bill_request':
      return 'Hesap Talebi'
    default:
      return 'Sistem'
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationList({
  notifications,
  isLoading,
  onMarkAsRead,
}: NotificationListProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-text-muted">
        Bildirimler yükleniyor...
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="p-6 text-sm text-text-muted">
        Gösterilecek bildirim bulunamadı.
      </div>
    )
  }

  return (
    <div className="divide-y divide-border-light">
      {notifications.map((notification) => {
        const guestOrderData =
          notification.type === 'guest_order'
            ? parseGuestOrderData(notification.data)
            : null
        const actionHref = getNotificationActionHref(notification)

        const handleNavigate = async () => {
          if (!actionHref) {
            return
          }

          if (!notification.isRead && onMarkAsRead) {
            await onMarkAsRead(notification.id)
          }

          router.push(actionHref)
        }

        return (
          <div
            key={notification.id}
            className={`p-4 ${notification.isRead ? 'bg-bg-surface' : 'bg-primary-main/5'}`}
          >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-primary-main">
                  {getTypeLabel(notification.type)}
                </span>
                {!notification.isRead && (
                  <span className="h-2 w-2 rounded-full bg-danger-main" />
                )}
              </div>
              <p className="mt-1 text-sm font-bold text-text-primary">
                {notification.title}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {notification.message}
              </p>
              {guestOrderData?.tableName ? (
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  Masa: {guestOrderData.tableName}
                </p>
              ) : null}
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-text-muted">
                <Clock3 className="h-3.5 w-3.5" />
                {formatDateTime(notification.created_at)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {actionHref ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleNavigate()
                  }}
                  className="inline-flex h-8 items-center justify-center rounded-sm border border-primary-main bg-white px-3 text-[10px] font-black uppercase tracking-wider text-primary-main transition-colors hover:bg-primary-main hover:text-white"
                >
                  {notification.type === 'guest_order' ? 'İncele' : 'Aç'}
                </button>
              ) : null}

              {!notification.isRead && onMarkAsRead ? (
                <Button
                  variant="outline"
                  onClick={() => onMarkAsRead(notification.id)}
                  className="h-8 px-3 text-[10px]"
                >
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  OKUNDU
                </Button>
              ) : null}
            </div>
          </div>
          </div>
        )
      })}
    </div>
  )
}
