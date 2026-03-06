'use client'

import React from 'react'
import { setServerOffset } from '@/modules/shared/utils/date'
import { guestApi, isGuestSessionInvalidError } from '../service'
import { GuestBootstrapResponse, GuestCatalogCategory, GuestOrder } from '../types'

const GUEST_PENDING_ORDERS_STORAGE_PREFIX = 'guest-pending-orders:'
const GUEST_DEBUG_ALLOWED =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_GUEST_DEBUG === '1'

function getGuestPendingOrdersStorageKey(sessionId: string) {
  return `${GUEST_PENDING_ORDERS_STORAGE_PREFIX}${sessionId}`
}

function readStoredPendingOrders(sessionId?: string | null): GuestOrder[] {
  if (typeof window === 'undefined' || !sessionId) {
    return []
  }

  const raw = window.sessionStorage.getItem(
    getGuestPendingOrdersStorageKey(sessionId),
  )

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as GuestOrder[]) : []
  } catch {
    return []
  }
}

function writeStoredPendingOrders(orders: GuestOrder[], sessionId?: string | null) {
  if (typeof window === 'undefined' || !sessionId) {
    return
  }

  const storageKey = getGuestPendingOrdersStorageKey(sessionId)

  if (!orders.length) {
    window.sessionStorage.removeItem(storageKey)
    return
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(orders))
}

function mergeSessionOrders(sessionOrders: GuestOrder[], sessionId: string) {
  const pendingOrders = readStoredPendingOrders(sessionId).filter(
    (order) => order.sessionId === sessionId && order.status.toUpperCase() === 'SUBMITTED',
  )

  if (!pendingOrders.length) {
    return sessionOrders
  }

  const merged = [...sessionOrders]

  for (const pendingOrder of pendingOrders) {
    if (!merged.some((order) => order.id === pendingOrder.id)) {
      merged.push(pendingOrder)
    }
  }

  return merged.sort((a, b) => {
    const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
    const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
    return bTime - aTime
  })
}

function reconcilePendingOrders(sessionOrders: GuestOrder[], sessionId: string) {
  const current = readStoredPendingOrders(sessionId)

  if (!current.length) {
    return
  }

  const next = current.filter((pendingOrder) => {
    if (pendingOrder.sessionId !== sessionId) {
      return true
    }

    return !sessionOrders.some((order) => order.id === pendingOrder.id)
  })

  writeStoredPendingOrders(next, sessionId)
}

export function upsertPendingOrder(order: GuestOrder) {
  if (order.status.toUpperCase() !== 'SUBMITTED') {
    return
  }

  const current = readStoredPendingOrders(order.sessionId)
  const next = [order, ...current.filter((entry) => entry.id !== order.id)]

  writeStoredPendingOrders(next, order.sessionId)
}

interface UseGuestBootstrapOptions {
  guestToken: string | null
  onSessionInvalidation: (reason: string) => void
  onSessionIdChange: (sessionId: string | null) => void
  onClearLock: () => void
  onHydrateDraft: (order: GuestOrder | null) => void
}

export interface UseGuestBootstrapResult {
  bootstrap: GuestBootstrapResponse | null
  catalog: GuestCatalogCategory[]
  isSyncing: boolean
  waiterCooldownUntil: string | null
  billCooldownUntil: string | null
  setCatalog: React.Dispatch<React.SetStateAction<GuestCatalogCategory[]>>
  setBootstrap: React.Dispatch<React.SetStateAction<GuestBootstrapResponse | null>>
  setWaiterCooldownUntil: React.Dispatch<React.SetStateAction<string | null>>
  setBillCooldownUntil: React.Dispatch<React.SetStateAction<string | null>>
  loadBootstrap: (
    token: string,
    hydrateDraft?: boolean,
  ) => Promise<GuestBootstrapResponse>
  scheduleBootstrapRefresh: () => void
  applyServerTime: (serverTime: string) => void
}

export function useGuestBootstrap({
  guestToken,
  onSessionInvalidation,
  onSessionIdChange,
  onClearLock,
  onHydrateDraft,
}: UseGuestBootstrapOptions): UseGuestBootstrapResult {
  const [bootstrap, setBootstrap] = React.useState<GuestBootstrapResponse | null>(null)
  const [catalog, setCatalog] = React.useState<GuestCatalogCategory[]>([])
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [waiterCooldownUntil, setWaiterCooldownUntil] = React.useState<string | null>(null)
  const [billCooldownUntil, setBillCooldownUntil] = React.useState<string | null>(null)

  const bootstrapRefreshTimeoutRef = React.useRef<number | null>(null)
  const bootstrapRefreshInFlightRef = React.useRef(false)
  const bootstrapRefreshQueuedRef = React.useRef(false)
  const debugEnabledRef = React.useRef(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    debugEnabledRef.current =
      GUEST_DEBUG_ALLOWED &&
      (params.get('guestDebug') === '1' ||
        window.sessionStorage.getItem('guest:debug') === '1')
  }, [])

  const debug = React.useCallback((step: string, payload?: Record<string, unknown>) => {
    if (!debugEnabledRef.current) {
      return
    }

    console.debug('[GuestBootstrapDebug]', step, payload || {})
  }, [])

  const applyServerTime = React.useCallback((serverTime: string) => {
    const serverTimestamp = new Date(serverTime).getTime()

    if (!Number.isNaN(serverTimestamp)) {
      setServerOffset(serverTimestamp - Date.now())
    }
  }, [])

  const withTimeout = React.useCallback(
    async <T,>(
      task: () => Promise<T>,
      timeoutMs = 15000,
      errorMessage = 'İstek zaman aşımına uğradı',
    ): Promise<T> => {
      let timeoutHandle: number | null = null

      try {
        return await Promise.race([
          task(),
          new Promise<T>((_, reject) => {
            timeoutHandle = window.setTimeout(() => {
              reject(new Error(errorMessage))
            }, timeoutMs)
          }),
        ])
      } finally {
        if (timeoutHandle) {
          window.clearTimeout(timeoutHandle)
        }
      }
    },
    [],
  )

  const loadBootstrap = React.useCallback(
    async (token: string, hydrateDraft = false) => {
      debug('load:start', {
        hasToken: Boolean(token),
        hydrateDraft,
      })
      setIsSyncing(true)
      try {
        const response = await withTimeout(
          () => guestApi.getBootstrap(token),
          15000,
          'Misafir verileri zamanında alınamadı',
        )

        applyServerTime(response.serverTime)

        const mergedSessionOrders = mergeSessionOrders(
          response.sessionOrders,
          response.session.id,
        )

        setBootstrap({
          ...response,
          sessionOrders: mergedSessionOrders,
        })
        setCatalog(response.catalog)
        setWaiterCooldownUntil(response.requestState.waiterNextAllowedAt)
        setBillCooldownUntil(response.requestState.billNextAllowedAt)
        onSessionIdChange(response.session.id)
        onClearLock()

        reconcilePendingOrders(response.sessionOrders, response.session.id)

        if (hydrateDraft) {
          onHydrateDraft(response.activeDraftOrder)
        }

        debug('load:success', {
          sessionId: response.session.id,
          catalogCount: response.catalog.length,
          ordersCount: response.sessionOrders.length,
        })
        return response
      } finally {
        setIsSyncing(false)
      }
    },
    [applyServerTime, debug, onClearLock, onHydrateDraft, onSessionIdChange, withTimeout],
  )

  const runScheduledBootstrapRefresh = React.useCallback(async () => {
    if (!guestToken) {
      return
    }

    if (bootstrapRefreshInFlightRef.current) {
      bootstrapRefreshQueuedRef.current = true
      return
    }

    bootstrapRefreshInFlightRef.current = true
    debug('refresh:run', {})

    try {
      await loadBootstrap(guestToken, false)
    } catch (error) {
      if (isGuestSessionInvalidError(error)) {
        debug('refresh:error_invalid_session', {})
        onSessionInvalidation('session_revoked')
        return
      }

      console.error('[Guest] Scheduled bootstrap refresh failed:', error)
      debug('refresh:error', {})
    } finally {
      bootstrapRefreshInFlightRef.current = false

      if (bootstrapRefreshQueuedRef.current) {
        bootstrapRefreshQueuedRef.current = false
        void runScheduledBootstrapRefresh()
      }
    }
  }, [debug, guestToken, loadBootstrap, onSessionInvalidation])

  const scheduleBootstrapRefresh = React.useCallback(() => {
    if (!guestToken) {
      return
    }

    if (bootstrapRefreshTimeoutRef.current) {
      window.clearTimeout(bootstrapRefreshTimeoutRef.current)
    }

    bootstrapRefreshTimeoutRef.current = window.setTimeout(() => {
      bootstrapRefreshTimeoutRef.current = null
      void runScheduledBootstrapRefresh()
    }, 750)
  }, [guestToken, runScheduledBootstrapRefresh])

  React.useEffect(
    () => () => {
      if (bootstrapRefreshTimeoutRef.current) {
        window.clearTimeout(bootstrapRefreshTimeoutRef.current)
      }
    },
    [],
  )

  React.useEffect(() => {
    if (!guestToken || !bootstrap?.session.id) {
      return
    }

    const catalogInterval = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') {
        return
      }

      try {
        const response = await guestApi.getCatalog(guestToken)
        applyServerTime(response.serverTime)
        setCatalog(response.catalog)
      } catch (error) {
        if (isGuestSessionInvalidError(error)) {
          onSessionInvalidation('session_revoked')
          return
        }

        console.error('[Guest] Catalog refresh failed:', error)
      }
    }, 60000)

    return () => {
      window.clearInterval(catalogInterval)
    }
  }, [applyServerTime, bootstrap?.session.id, guestToken, onSessionInvalidation])

  return {
    bootstrap,
    catalog,
    isSyncing,
    waiterCooldownUntil,
    billCooldownUntil,
    setCatalog,
    setBootstrap,
    setWaiterCooldownUntil,
    setBillCooldownUntil,
    loadBootstrap,
    scheduleBootstrapRefresh,
    applyServerTime,
  }
}
