'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Menu,
  UtensilsCrossed,
  Bell,
  User,
  CheckCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUI } from '@/modules/shared/context/UIContext'
import { useSocketStore } from '@/modules/shared/api/socket'
import { playNotificationAudio } from '@/modules/shared/utils/notification-sound'
import { http } from '@/modules/shared/api/http'
import { notificationsService } from '@/modules/notifications/services'
import { Notification } from '@/modules/notifications/types'
import {
  emitNotificationRead,
  emitNotificationsReadAll,
  getNotificationActionHref,
  NOTIFICATION_READ_EVENT,
  NOTIFICATIONS_READ_ALL_EVENT,
} from '@/modules/notifications/utils'

const MAIN_HEADER_SOURCE = 'main-header'

interface CurrentUser {
  id: string
  email: string
  role: string
  restaurantId?: string
  restaurant_id?: string
  first_name?: string
  last_name?: string
}

function getRoleLabel(role: string): string {
  const normalized = role?.toLowerCase() || ''
  if (normalized === 'super_admin') return 'Sistem Yöneticisi'
  if (normalized === 'restaurant_owner') return 'İşletme Sahibi'
  if (normalized === 'manager') return 'Yönetici'
  if (normalized === 'waiter') return 'Garson'
  if (normalized === 'chef' || normalized === 'kitchen') return 'Mutfak'
  if (normalized === 'cashier') return 'Kasiyer'
  return role || 'Kullanıcı'
}

function getDisplayName(user: CurrentUser | null): string {
  if (!user) return 'Kullanıcı'
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return fullName || user.email
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getNotificationSound(type: Notification['type']): string | null {
  switch (type) {
    case 'waiter_call':
      return '/guest.mp3'
    case 'bill_request':
      return '/payment.mp3'
    case 'guest_order':
      return '/orders.mp3'
    default:
      return null
  }
}

export function MainHeader() {
  const router = useRouter()
  const { toggleSidebar } = useUI()
  const connectSocket = useSocketStore((state) => state.connect)
  const socket = useSocketStore((state) => state.socket)

  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBellOpen, setIsBellOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const bellRef = useRef<HTMLDivElement | null>(null)

  const loadUserAndNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const me = await http.get<CurrentUser>('/auth/me')
      setUser(me)
      const restaurantId = me.restaurantId || me.restaurant_id
      if (restaurantId) {
        connectSocket(restaurantId)
      }

      const [listResponse, unread] = await Promise.all([
        notificationsService.getNotifications({ page: 1, limit: 8 }),
        notificationsService.getUnreadCount(),
      ])
      setNotifications(listResponse.items || [])
      setUnreadCount(unread)
    } finally {
      setIsLoading(false)
    }
  }, [connectSocket])

  useEffect(() => {
    void loadUserAndNotifications()
  }, [loadUserAndNotifications])

  useEffect(() => {
    if (!socket) {
      return
    }

    const handleNewNotification = (payload: unknown) => {
      const incoming = payload as Notification
      setUnreadCount((prev) => prev + 1)
      setNotifications((prev) => {
        if (prev.some((item) => item.id === incoming.id)) {
          return prev
        }
        return [incoming, ...prev].slice(0, 8)
      })

      const sound = getNotificationSound(incoming.type)
      if (sound) {
        playNotificationAudio(sound)
      }

      if (incoming.type === 'waiter_call' || incoming.type === 'bill_request') {
        toast.success(incoming.title, {
          description: incoming.message,
        })
      }
    }

    socket.on('new_notification', handleNewNotification)
    return () => {
      socket.off('new_notification', handleNewNotification)
    }
  }, [socket])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!bellRef.current) return
      if (!bellRef.current.contains(event.target as Node)) {
        setIsBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleNotificationRead = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; source?: string }>).detail

      if (!detail?.id || detail.source === MAIN_HEADER_SOURCE) {
        return
      }

      let shouldDecrement = false

      setNotifications((prev) =>
        prev.map((notification) => {
          if (notification.id !== detail.id || notification.isRead) {
            return notification
          }

          shouldDecrement = true
          return { ...notification, isRead: true }
        }),
      )

      if (shouldDecrement) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    }

    const handleNotificationsReadAll = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string }>).detail
      if (detail?.source === MAIN_HEADER_SOURCE) {
        return
      }

      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
      setUnreadCount(0)
    }

    window.addEventListener(NOTIFICATION_READ_EVENT, handleNotificationRead as EventListener)
    window.addEventListener(
      NOTIFICATIONS_READ_ALL_EVENT,
      handleNotificationsReadAll as EventListener,
    )

    return () => {
      window.removeEventListener(
        NOTIFICATION_READ_EVENT,
        handleNotificationRead as EventListener,
      )
      window.removeEventListener(
        NOTIFICATIONS_READ_ALL_EVENT,
        handleNotificationsReadAll as EventListener,
      )
    }
  }, [])

  const userName = useMemo(() => getDisplayName(user), [user])
  const roleLabel = useMemo(() => getRoleLabel(user?.role || ''), [user?.role])

  async function handleMarkAllAsRead() {
    await notificationsService.markAllAsRead()
    setUnreadCount(0)
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    emitNotificationsReadAll(MAIN_HEADER_SOURCE)
  }

  async function handleMarkAsRead(id: string) {
    const target = notifications.find((item) => item.id === id)
    await notificationsService.markAsRead(id)
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    )
    if (!target?.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    emitNotificationRead(id, MAIN_HEADER_SOURCE)
  }

  async function handleNotificationClick(notification: Notification) {
    const actionHref = getNotificationActionHref(notification)

    if (!actionHref) {
      return
    }

    if (!notification.isRead) {
      await handleMarkAsRead(notification.id)
    }

    setIsBellOpen(false)
    router.push(actionHref)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-[90] bg-bg-surface border-b border-border-light h-16 flex items-center justify-between shadow-sm">
      <div className="flex items-center h-full">
        <div className="w-20 flex items-center justify-center border-r border-border-light/50 h-full">
          <button
            onClick={toggleSidebar}
            className="p-2.5 hover:bg-bg-app text-text-muted hover:text-primary-main transition-all rounded-sm border border-transparent hover:border-border-light focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:outline-none"
            aria-label="Ana Menüyü Aç"
          >
            <Menu size={24} />
          </button>
        </div>

        <div className="flex items-center gap-3 px-8">
          <div className="w-9 h-9 bg-primary-main rounded-sm flex items-center justify-center shadow-sm">
            <UtensilsCrossed size={18} className="text-text-inverse" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-text-primary uppercase tracking-tight leading-none">
              POSMENUM - RMS
            </span>
            <span className="text-[8px] font-black text-primary-main uppercase tracking-widest mt-1">
              RESTAURANT MANAGEMENT SYSTEM
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 px-6">
        <div className="relative" ref={bellRef}>
          <button
            className="relative p-2.5 hover:bg-bg-app text-text-muted hover:text-text-primary transition-all rounded-sm border border-transparent hover:border-border-light focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:outline-none"
            aria-label="Bildirimler"
            onClick={() => setIsBellOpen((prev) => !prev)}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-danger-main text-text-inverse text-[10px] font-black min-w-4 h-4 px-1 flex items-center justify-center rounded-full border-2 border-bg-surface">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isBellOpen && (
            <div className="absolute right-0 mt-2 w-[360px] bg-bg-surface border border-border-light rounded-sm shadow-xl overflow-hidden z-[120]">
              <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-text-primary">
                  Bildirimler
                </span>
                <button
                  onClick={() => void handleMarkAllAsRead()}
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-primary-main hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tümünü Okundu Yap
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="px-4 py-6 text-sm text-text-muted">
                    Bildirim bulunamadı.
                  </div>
                )}
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-border-light/60 ${
                      notification.isRead ? 'bg-bg-surface' : 'bg-primary-main/5'
                    }`}
                  >
                    <p className="text-sm font-bold text-text-primary">
                      {notification.title}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {notification.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-text-muted">
                        {formatTime(notification.created_at)}
                      </span>
                      <div className="flex items-center gap-3">
                        {getNotificationActionHref(notification) ? (
                          <button
                            onClick={() => void handleNotificationClick(notification)}
                            className="text-[10px] font-black uppercase tracking-wider text-primary-main hover:underline"
                          >
                            Aç
                          </button>
                        ) : null}
                        {!notification.isRead && (
                          <button
                            onClick={() => void handleMarkAsRead(notification.id)}
                            className="text-[10px] font-black uppercase tracking-wider text-primary-main hover:underline"
                          >
                            Okundu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-border-light bg-bg-app/40">
                <button
                  onClick={() => {
                    setIsBellOpen(false)
                    router.push('/notifications')
                  }}
                  className="w-full text-center text-xs font-black uppercase tracking-wider text-primary-main hover:underline"
                >
                  Tüm Bildirimleri Gör
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-border-light" />

        <Link href="/settings?tab=users" className="flex items-center gap-3 cursor-pointer group">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-semibold text-text-primary leading-none">
              {isLoading ? 'Yükleniyor...' : userName}
            </span>
            <span className="text-xs font-medium text-primary-main mt-1">
              {isLoading ? '' : roleLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-bg-app p-1 pr-3 rounded-sm border border-border-light group-hover:border-primary-main transition-all">
            <div className="w-9 h-9 rounded-sm bg-bg-surface flex items-center justify-center border border-border-light overflow-hidden">
              <User size={18} className="text-text-muted group-hover:text-primary-main transition-colors" />
            </div>
          </div>
        </Link>
      </div>
    </header>
  )
}
