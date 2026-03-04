'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSocketStore } from '@/modules/shared/api/socket'
import { notificationsService } from '../services'
import {
  GetNotificationsParams,
  Notification,
  NotificationType,
  NotificationsMeta,
} from '../types'
import {
  emitNotificationRead,
  emitNotificationsReadAll,
  NOTIFICATION_READ_EVENT,
  NOTIFICATIONS_READ_ALL_EVENT,
} from '../utils'

const NOTIFICATIONS_HOOK_SOURCE = 'notifications-hook'

interface UseNotificationsOptions {
  initialPage?: number
  initialLimit?: number
  realtime?: boolean
}

const DEFAULT_META: NotificationsMeta = {
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: 20,
  totalPages: 0,
  currentPage: 1,
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    initialPage = 1,
    initialLimit = 20,
    realtime = true,
  } = options

  const socket = useSocketStore((state) => state.socket)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [meta, setMeta] = useState<NotificationsMeta>({
    ...DEFAULT_META,
    currentPage: initialPage,
    itemsPerPage: initialLimit,
  })
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [isReadFilter, setIsReadFilter] = useState<boolean | undefined>(undefined)
  const [typeFilter, setTypeFilter] = useState<NotificationType | undefined>(undefined)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)

  const queryParams = useMemo<GetNotificationsParams>(
    () => ({
      page,
      limit,
      ...(isReadFilter !== undefined ? { isRead: isReadFilter } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
    }),
    [isReadFilter, limit, page, typeFilter],
  )

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await notificationsService.getNotifications(queryParams)
      setNotifications(response.items || [])
      setMeta(response.meta || DEFAULT_META)
    } finally {
      setIsLoading(false)
    }
  }, [queryParams])

  const fetchUnreadCount = useCallback(async () => {
    const count = await notificationsService.getUnreadCount()
    setUnreadCount(count)
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    setIsMutating(true)
    try {
      const target = notifications.find((notification) => notification.id === id)
      await notificationsService.markAsRead(id)
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification,
        ),
      )
      if (!target?.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
      emitNotificationRead(id, NOTIFICATIONS_HOOK_SOURCE)
    } finally {
      setIsMutating(false)
    }
  }, [notifications])

  const markAllAsRead = useCallback(async () => {
    setIsMutating(true)
    try {
      await notificationsService.markAllAsRead()
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true })),
      )
      setUnreadCount(0)
      emitNotificationsReadAll(NOTIFICATIONS_HOOK_SOURCE)
    } finally {
      setIsMutating(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([fetchNotifications(), fetchUnreadCount()])
  }, [fetchNotifications, fetchUnreadCount])

  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    void fetchUnreadCount()
  }, [fetchUnreadCount])

  useEffect(() => {
    if (!realtime || !socket) return

    const handleNewNotification = (payload: unknown) => {
      const incoming = payload as Notification
      setUnreadCount((prev) => prev + 1)

      const filterMatchesRead =
        isReadFilter === undefined || isReadFilter === incoming.isRead
      const filterMatchesType =
        !typeFilter || typeFilter === incoming.type

      if (!filterMatchesRead || !filterMatchesType) {
        return
      }

      if (page !== 1) {
        return
      }

      setNotifications((prev) => {
        if (prev.some((item) => item.id === incoming.id)) {
          return prev
        }
        const next = [incoming, ...prev]
        return next.slice(0, limit)
      })

      setMeta((prev) => ({
        ...prev,
        totalItems: prev.totalItems + 1,
        itemCount: Math.min(prev.itemCount + 1, limit),
      }))
    }

    socket.on('new_notification', handleNewNotification)
    return () => {
      socket.off('new_notification', handleNewNotification)
    }
  }, [isReadFilter, limit, page, realtime, socket, typeFilter])

  useEffect(() => {
    if (!realtime) return

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [realtime, refresh])

  useEffect(() => {
    const handleNotificationRead = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; source?: string }>).detail

      if (!detail?.id || detail.source === NOTIFICATIONS_HOOK_SOURCE) {
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
      if (detail?.source === NOTIFICATIONS_HOOK_SOURCE) {
        return
      }

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true })),
      )
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

  return {
    notifications,
    meta,
    page,
    limit,
    isReadFilter,
    typeFilter,
    unreadCount,
    isLoading,
    isMutating,
    setPage,
    setLimit,
    setIsReadFilter,
    setTypeFilter,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    refresh,
  }
}
