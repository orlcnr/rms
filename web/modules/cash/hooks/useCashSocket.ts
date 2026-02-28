// ============================================
// CASH MODULE SOCKET HOOK
// Simple socket event listener for cash operations
// ============================================

import { useEffect, useCallback } from 'react'
import { CashSocketEvents } from '../socket'

interface UseCashSocketOptions {
  restaurantId: string
  onMovementCreated?: (data: {
    sessionId: string
    restaurantId: string
  }) => void
  onTipReceived?: (data: {
    sessionId: string
    restaurantId: string
  }) => void
  onSessionOpened?: (data: {
    sessionId: string
    restaurantId: string
  }) => void
  onSessionClosed?: (data: {
    sessionId: string
    restaurantId: string
  }) => void
}

/**
 * Hook for managing real-time cash updates via socket
 * Calls provided callbacks when events are received
 */
export function useCashSocket(options: UseCashSocketOptions) {
  const { restaurantId, onMovementCreated, onTipReceived, onSessionOpened, onSessionClosed } = options

  const handleMovementCreated = useCallback(
    (data: { sessionId: string; restaurantId: string }) => {
      if (data.restaurantId !== restaurantId) return
      console.log('[Cash Socket] Movement created:', data)
      onMovementCreated?.(data)
    },
    [restaurantId, onMovementCreated]
  )

  const handleTipReceived = useCallback(
    (data: { sessionId: string; restaurantId: string }) => {
      if (data.restaurantId !== restaurantId) return
      console.log('[Cash Socket] Tip received:', data)
      onTipReceived?.(data)
    },
    [restaurantId, onTipReceived]
  )

  const handleSessionOpened = useCallback(
    (data: { sessionId: string; restaurantId: string }) => {
      if (data.restaurantId !== restaurantId) return
      console.log('[Cash Socket] Session opened:', data)
      onSessionOpened?.(data)
    },
    [restaurantId, onSessionOpened]
  )

  const handleSessionClosed = useCallback(
    (data: { sessionId: string; restaurantId: string }) => {
      if (data.restaurantId !== restaurantId) return
      console.log('[Cash Socket] Session closed:', data)
      onSessionClosed?.(data)
    },
    [restaurantId, onSessionClosed]
  )

  useEffect(() => {
    // Socket listener setup would go here
    // const socket = getSocket()
    //
    // socket.on(CashSocketEvents.CASH_MOVEMENT_CREATED, handleMovementCreated)
    // socket.on(CashSocketEvents.TIP_RECEIVED, handleTipReceived)
    // socket.on(CashSocketEvents.CASH_SESSION_OPENED, handleSessionOpened)
    // socket.on(CashSocketEvents.CASH_SESSION_CLOSED, handleSessionClosed)

    // Cleanup
    return () => {
      console.log('[Cash Socket] Cleaning up listeners...')
      // socket.off(CashSocketEvents.CASH_MOVEMENT_CREATED, handleMovementCreated)
      // socket.off(CashSocketEvents.TIP_RECEIVED, handleTipReceived)
      // socket.off(CashSocketEvents.CASH_SESSION_OPENED, handleSessionOpened)
      // socket.off(CashSocketEvents.CASH_SESSION_CLOSED, handleSessionClosed)
    }
  }, [
    restaurantId,
    handleMovementCreated,
    handleTipReceived,
    handleSessionOpened,
    handleSessionClosed,
  ])
}

export default useCashSocket
