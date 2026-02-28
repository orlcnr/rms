// ============================================
// USE ORDERS SOCKET HOOK
// Real-time order updates via socket.io
// Sesli uyarılar ve yeni event'ler eklendi
// useRef ile stale closure fix uygulandı
// ============================================

'use client'

import { useEffect, useRef } from 'react'
import { useSocketStore } from '@/modules/shared/api/socket'
import { Order, OrderStatus, OrderItem } from '../types'

interface OrderSocketEvents {
  onOrderCreated?: (order: Order) => void
  onOrderUpdated?: (order: Order) => void
  onOrderStatusChanged?: (data: {
    orderId: string
    oldStatus: OrderStatus
    newStatus: OrderStatus
    order: Order
  }) => void
  onOrderItemAdded?: (data: {
    orderId: string
    item: OrderItem
    requestTime: string
  }) => void
  enableSound?: boolean
}

const SOCKET_EVENTS = {
  ORDER_CREATED: 'new_order',
  ORDER_UPDATED: 'order:updated',
  ORDER_STATUS_UPDATED: 'order_status_updated',
  ORDER_ITEM_ADDED: 'order_item_added',
} as const

// Audio player reference
let audioPlayer: HTMLAudioElement | null = null

const playNotificationSound = () => {
  try {
    if (!audioPlayer) {
      audioPlayer = new Audio('/sounds/new-order.mp3')
      audioPlayer.volume = 0.5
    }
    audioPlayer.currentTime = 0
    audioPlayer.play().catch(() => { })
  } catch {
    // Ignore audio errors
  }
}

export function useOrdersSocket(
  restaurantId: string,
  handlers: OrderSocketEvents
) {
  const { connect, disconnect, socket, isConnected } = useSocketStore()

  // -------------------------------------------------------
  // Stale closure fix: keep handler refs always up-to-date
  // The useEffect that registers socket.io listeners will
  // only run once (on mount / socket change), while the refs
  // are mutated on every render so callbacks always see the
  // latest state from the parent component.
  // -------------------------------------------------------
  const onOrderCreatedRef = useRef(handlers.onOrderCreated)
  const onOrderUpdatedRef = useRef(handlers.onOrderUpdated)
  const onOrderStatusChangedRef = useRef(handlers.onOrderStatusChanged)
  const onOrderItemAddedRef = useRef(handlers.onOrderItemAdded)
  const enableSoundRef = useRef(handlers.enableSound)

  // Sync refs every render — no re-registration of listeners
  onOrderCreatedRef.current = handlers.onOrderCreated
  onOrderUpdatedRef.current = handlers.onOrderUpdated
  onOrderStatusChangedRef.current = handlers.onOrderStatusChanged
  onOrderItemAddedRef.current = handlers.onOrderItemAdded
  enableSoundRef.current = handlers.enableSound

  // Connect on mount
  useEffect(() => {
    if (!restaurantId) return
    connect(restaurantId)
    return () => {
      disconnect()
    }
  }, [restaurantId, connect, disconnect])

  // Register all listeners once when socket instance is ready.
  // Using the raw socket from the store so we can bind to a
  // specific socket instance and avoid the global off() problem.
  useEffect(() => {
    if (!socket) return

    const handleOrderCreated = (data: unknown) => {
      console.log('[OrdersSocket] new_order event:', data)
      const order = data as Order
      onOrderCreatedRef.current?.(order)
      if (enableSoundRef.current) playNotificationSound()
    }

    const handleOrderUpdated = (data: unknown) => {
      console.log('[OrdersSocket] order:updated event:', data)
      onOrderUpdatedRef.current?.(data as Order)
    }

    const handleOrderStatusUpdated = (data: unknown) => {
      console.log('[OrdersSocket] order_status_updated event:', data)
      const payload = data as {
        orderId: string
        oldStatus: OrderStatus
        newStatus: OrderStatus
        order: Order
      }
      onOrderStatusChangedRef.current?.(payload)
    }

    const handleOrderItemAdded = (data: unknown) => {
      console.log('[OrdersSocket] order_item_added event:', data)
      const payload = data as {
        orderId: string
        item: OrderItem
        requestTime: string
      }
      onOrderItemAddedRef.current?.(payload)
      if (enableSoundRef.current) playNotificationSound()
    }

    socket.on(SOCKET_EVENTS.ORDER_CREATED, handleOrderCreated)
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, handleOrderUpdated)
    socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderStatusUpdated)
    socket.on(SOCKET_EVENTS.ORDER_ITEM_ADDED, handleOrderItemAdded)

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_CREATED, handleOrderCreated)
      socket.off(SOCKET_EVENTS.ORDER_UPDATED, handleOrderUpdated)
      socket.off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderStatusUpdated)
      socket.off(SOCKET_EVENTS.ORDER_ITEM_ADDED, handleOrderItemAdded)
    }
  }, [socket]) // only re-runs when the socket instance changes

  return {
    isConnected,
  }
}
