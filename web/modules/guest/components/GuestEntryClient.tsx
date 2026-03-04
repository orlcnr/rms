'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { getNow, setServerOffset } from '@/modules/shared/utils/date'
import { guestApi, isGuestSessionInvalidError } from '../service'
import { useGuestBasket } from '../hooks/useGuestBasket'
import { useGuestSocket } from '../hooks/useGuestSocket'
import type {
  GuestBootstrapResponse,
  GuestCatalogCategory,
  GuestCatalogItem,
  GuestOrder,
  GuestTabKey,
} from '../types'
import { getGuestSessionUiState } from '../session-ui-config'
import { GuestAccountView } from './GuestAccountView'
import { GuestBottomNav } from './GuestBottomNav'
import { GuestCartView } from './GuestCartView'
import { GuestHeader } from './GuestHeader'
import { GuestLockScreen } from './GuestLockScreen'
import { GuestMenuView } from './GuestMenuView'
import { GuestOrdersView } from './GuestOrdersView'
import { GuestShell } from './GuestShell'
import { GuestStatusBanner } from './GuestStatusBanner'
import { ALL_TAB_KEY, POPULAR_TAB_KEY } from './GuestCategoryTabs'

function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return {
    userAgent: window.navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: window.navigator.language,
    platform: window.navigator.platform,
  }
}

function getOrderBadgeCount(sessionOrders: GuestBootstrapResponse['sessionOrders']) {
  return sessionOrders.filter((order) => {
    const status = order.status.toUpperCase()
    return status !== 'APPROVED' && status !== 'REJECTED' && status !== 'CONVERTED'
  }).length
}

interface GuestEntryClientProps {
  qrToken?: string
}

const ACTIVE_GUEST_TOKEN_STORAGE_KEY = 'guest:activeToken'
const ACTIVE_GUEST_SESSION_ID_STORAGE_KEY = 'guest:activeSessionId'
const GUEST_LOCK_REASON_STORAGE_KEY = 'guest:lockReason'

function getGuestSessionStorageKey() {
  return ACTIVE_GUEST_TOKEN_STORAGE_KEY
}

function getGuestActiveSessionIdStorageKey() {
  return ACTIVE_GUEST_SESSION_ID_STORAGE_KEY
}

function getGuestLockReasonStorageKey() {
  return GUEST_LOCK_REASON_STORAGE_KEY
}

function getGuestPendingOrdersStorageKey(sessionId: string) {
  return `guest-pending-orders:${sessionId}`
}

function getGuestBasketStorageKey(sessionId: string) {
  return `guest-basket:${sessionId}`
}

export function GuestEntryClient({ qrToken }: GuestEntryClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resolvedQrToken = qrToken || searchParams.get('token') || undefined
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)
  const basketStorageKey = activeSessionId
    ? getGuestBasketStorageKey(activeSessionId)
    : null
  const [guestToken, setGuestToken] = React.useState<string | null>(null)
  const [bootstrap, setBootstrap] = React.useState<GuestBootstrapResponse | null>(null)
  const [catalog, setCatalog] = React.useState<GuestCatalogCategory[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [isSessionEnded, setIsSessionEnded] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [lockReason, setLockReason] = React.useState<string | null>(null)
  const [waiterCooldownUntil, setWaiterCooldownUntil] = React.useState<string | null>(null)
  const [billCooldownUntil, setBillCooldownUntil] = React.useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<GuestTabKey>('menu')
  const [animatedItemId, setAnimatedItemId] = React.useState<string | null>(null)

  const basket = useGuestBasket({
    token: guestToken,
    initialDraftOrder: null,
    storageKey: basketStorageKey,
  })
  const hydrateDraftRef = React.useRef(basket.hydrateDraft)
  const animationTimeoutRef = React.useRef<number | null>(null)
  const bootstrapRefreshTimeoutRef = React.useRef<number | null>(null)
  const bootstrapRefreshInFlightRef = React.useRef(false)
  const bootstrapRefreshQueuedRef = React.useRef(false)
  const categoryRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})

  const persistGuestToken = React.useCallback(
    (token: string | null) => {
      if (typeof window === 'undefined') {
        return
      }

      const storageKey = getGuestSessionStorageKey()

      if (!token) {
        window.sessionStorage.removeItem(storageKey)
        return
      }

      window.sessionStorage.setItem(storageKey, token)
    },
    [],
  )

  const persistActiveSessionId = React.useCallback((sessionId: string | null) => {
    if (typeof window === 'undefined') {
      return
    }

    const storageKey = getGuestActiveSessionIdStorageKey()

    if (!sessionId) {
      window.sessionStorage.removeItem(storageKey)
      return
    }

    window.sessionStorage.setItem(storageKey, sessionId)
  }, [])

  const persistLockState = React.useCallback((reason: string | null) => {
    if (typeof window === 'undefined') {
      return
    }

    const storageKey = getGuestLockReasonStorageKey()

    if (!reason) {
      window.sessionStorage.removeItem(storageKey)
      return
    }

    window.sessionStorage.setItem(storageKey, reason)
  }, [])

  const getStoredGuestToken = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return window.sessionStorage.getItem(getGuestSessionStorageKey())
  }, [])

  const getStoredActiveSessionId = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return window.sessionStorage.getItem(getGuestActiveSessionIdStorageKey())
  }, [])

  const getStoredLockReason = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return window.sessionStorage.getItem(getGuestLockReasonStorageKey())
  }, [])

  const readStoredPendingOrders = React.useCallback((sessionId?: string | null): GuestOrder[] => {
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
  }, [])

  const writeStoredPendingOrders = React.useCallback(
    (orders: GuestOrder[], sessionId?: string | null) => {
      if (typeof window === 'undefined' || !sessionId) {
        return
      }

      const storageKey = getGuestPendingOrdersStorageKey(sessionId)

      if (!orders.length) {
        window.sessionStorage.removeItem(storageKey)
        return
      }

      window.sessionStorage.setItem(storageKey, JSON.stringify(orders))
    },
    [],
  )

  const mergeSessionOrders = React.useCallback(
    (sessionOrders: GuestOrder[], sessionId: string) => {
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
    },
    [readStoredPendingOrders],
  )

  const upsertPendingOrder = React.useCallback(
    (order: GuestOrder) => {
      if (order.status.toUpperCase() !== 'SUBMITTED') {
        return
      }

      const current = readStoredPendingOrders(order.sessionId)
      const next = [
        order,
        ...current.filter((entry) => entry.id !== order.id),
      ]

      writeStoredPendingOrders(next, order.sessionId)
    },
    [readStoredPendingOrders, writeStoredPendingOrders],
  )

  const reconcilePendingOrders = React.useCallback(
    (sessionOrders: GuestOrder[], sessionId: string) => {
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
    },
    [readStoredPendingOrders, writeStoredPendingOrders],
  )

  React.useEffect(() => {
    hydrateDraftRef.current = basket.hydrateDraft
  }, [basket.hydrateDraft])

  React.useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current)
      }
      if (bootstrapRefreshTimeoutRef.current) {
        window.clearTimeout(bootstrapRefreshTimeoutRef.current)
      }
    }
  }, [])

  const applyServerTime = React.useCallback((serverTime: string) => {
    const serverTimestamp = new Date(serverTime).getTime()

    if (!Number.isNaN(serverTimestamp)) {
      setServerOffset(serverTimestamp - Date.now())
    }
  }, [])

  const clearGuestClientState = React.useCallback((reason?: string | null) => {
    if (typeof window !== 'undefined') {
      const storedSessionId =
        activeSessionId || window.sessionStorage.getItem(getGuestActiveSessionIdStorageKey())

      if (storedSessionId) {
        window.sessionStorage.removeItem(getGuestBasketStorageKey(storedSessionId))
        window.sessionStorage.removeItem(
          getGuestPendingOrdersStorageKey(storedSessionId),
        )
      }
    }

    basket.reset()
    persistGuestToken(null)
    persistActiveSessionId(null)
    persistLockState(reason || null)
    setGuestToken(null)
    setActiveSessionId(null)
    setBootstrap(null)
    setCatalog([])
    setWaiterCooldownUntil(null)
    setBillCooldownUntil(null)
    setSelectedCategoryId(null)
    setActiveTab('menu')
    setIsSessionEnded(Boolean(reason))
    setLockReason(reason || null)
    setErrorMessage(
      reason ? getGuestSessionUiState(reason).description : null,
    )
  }, [activeSessionId, basket, persistActiveSessionId, persistGuestToken, persistLockState])

  const handleSessionInvalidation = React.useCallback((reason: string) => {
    clearGuestClientState(reason)
  }, [clearGuestClientState])

  const loadBootstrap = React.useCallback(
    async (token: string, hydrateDraft = false) => {
      setIsSyncing(true)
      try {
        const response = await guestApi.getBootstrap(token)
        applyServerTime(response.serverTime)
        const mergedSessionOrders = mergeSessionOrders(
          response.sessionOrders,
          response.session.id,
        )

        setBootstrap({
          ...response,
          sessionOrders: mergedSessionOrders,
        })
        setActiveSessionId(response.session.id)
        persistActiveSessionId(response.session.id)
        setIsSessionEnded(false)
        setLockReason(null)
        setErrorMessage(null)
        persistLockState(null)
        setCatalog(response.catalog)
        setWaiterCooldownUntil(response.requestState.waiterNextAllowedAt)
        setBillCooldownUntil(response.requestState.billNextAllowedAt)
        reconcilePendingOrders(response.sessionOrders, response.session.id)
        if (hydrateDraft) {
          hydrateDraftRef.current(response.activeDraftOrder)
        }
      } finally {
        setIsSyncing(false)
      }
    },
    [applyServerTime, mergeSessionOrders, persistActiveSessionId, persistLockState, reconcilePendingOrders],
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

    try {
      await loadBootstrap(guestToken, false)
    } catch (error) {
      if (isGuestSessionInvalidError(error)) {
        handleSessionInvalidation('session_revoked')
        return
      }

      console.error('[Guest] Scheduled bootstrap refresh failed:', error)
    } finally {
      bootstrapRefreshInFlightRef.current = false

      if (bootstrapRefreshQueuedRef.current) {
        bootstrapRefreshQueuedRef.current = false
        void runScheduledBootstrapRefresh()
      }
    }
  }, [guestToken, handleSessionInvalidation, loadBootstrap])

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

  React.useEffect(() => {
    let isMounted = true

    async function initialize() {
      try {
        if (resolvedQrToken) {
          clearGuestClientState(null)

          const sessionResponse = await guestApi.createSession({
            qrToken: resolvedQrToken,
            deviceInfo: getDeviceInfo(),
          })

          if (!isMounted) {
            return
          }

          setGuestToken(sessionResponse.guestAccessToken)
          persistGuestToken(sessionResponse.guestAccessToken)
          await loadBootstrap(sessionResponse.guestAccessToken, true)
          router.replace('/guest')
          return
        }

        const storedGuestToken = getStoredGuestToken()
        const storedLockReason = getStoredLockReason()
        const storedSessionId = getStoredActiveSessionId()

        if (!storedGuestToken || !storedSessionId) {
          handleSessionInvalidation(storedLockReason || 'session_revoked')
          return
        }

        try {
          setGuestToken(storedGuestToken)
          setActiveSessionId(storedSessionId)
          await loadBootstrap(storedGuestToken, true)
        } catch (error) {
          console.warn('[Guest] Stored session restore failed.', error)
          handleSessionInvalidation(
            isGuestSessionInvalidError(error)
              ? 'session_revoked'
              : storedLockReason || 'session_revoked',
          )
        }
      } catch (error) {
        console.error('[Guest] Initialization failed:', error)
        if (isMounted) {
          handleSessionInvalidation(
            isGuestSessionInvalidError(error)
              ? 'session_revoked'
              : resolvedQrToken
                ? 'invalid_qr'
                : 'session_revoked',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void initialize()

    return () => {
      isMounted = false
    }
  }, [
    clearGuestClientState,
    getStoredActiveSessionId,
    getStoredGuestToken,
    getStoredLockReason,
    handleSessionInvalidation,
    loadBootstrap,
    persistGuestToken,
    resolvedQrToken,
    router,
  ])

  useGuestSocket({
    token: guestToken,
    onSessionRevoked: (reason) => {
      handleSessionInvalidation(reason)
    },
    onOrderStatusChanged: scheduleBootstrapRefresh,
    onTableRefresh: scheduleBootstrapRefresh,
  })

  const validateCurrentSession = React.useCallback(async () => {
    if (!guestToken || !bootstrap?.session.id) {
      return false
    }

    try {
      const response = await guestApi.heartbeat(guestToken, bootstrap.session.id)

      if (!response.isActive) {
        handleSessionInvalidation('session_revoked')
        return false
      }

      if (response.guestAccessToken) {
        setGuestToken(response.guestAccessToken)
        persistGuestToken(response.guestAccessToken)
      }

      return true
    } catch (error) {
      console.error('[Guest] Session validation failed:', error)
      if (isGuestSessionInvalidError(error)) {
        handleSessionInvalidation('session_revoked')
        return false
      }

      return true
    }
  }, [bootstrap?.session.id, guestToken, handleSessionInvalidation, persistGuestToken])

  React.useEffect(() => {
    if (!guestToken || !bootstrap?.session.id) {
      return
    }

    const heartbeatInterval = window.setInterval(async () => {
      await validateCurrentSession()
    }, 15000)

    return () => {
      window.clearInterval(heartbeatInterval)
    }
  }, [bootstrap?.session.id, guestToken, validateCurrentSession])

  React.useEffect(() => {
    const handleForegroundValidation = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') {
        return
      }

      void validateCurrentSession()
    }

    window.addEventListener('focus', handleForegroundValidation)
    window.addEventListener('online', handleForegroundValidation)
    document.addEventListener('visibilitychange', handleForegroundValidation)

    return () => {
      window.removeEventListener('focus', handleForegroundValidation)
      window.removeEventListener('online', handleForegroundValidation)
      document.removeEventListener('visibilitychange', handleForegroundValidation)
    }
  }, [validateCurrentSession])

  React.useEffect(() => {
    if (!guestToken || !bootstrap) {
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
          handleSessionInvalidation('session_revoked')
          return
        }

        console.error('[Guest] Catalog refresh failed:', error)
      }
    }, 60000)

    return () => {
      window.clearInterval(catalogInterval)
    }
  }, [applyServerTime, bootstrap, guestToken, handleSessionInvalidation])

  const availableIds = React.useMemo(
    () =>
      new Set(
        catalog.flatMap((category) => category.items.map((item) => item.id)),
      ),
    [catalog],
  )

  const invalidBasketItems = basket.basketItems.filter(
    (item) => !availableIds.has(item.menuItemId),
  )

  const invalidMenuItemIds = React.useMemo(
    () => new Set(invalidBasketItems.map((item) => item.menuItemId)),
    [invalidBasketItems],
  )

  const quantitiesByItemId = React.useMemo(
    () =>
      basket.basketItems.reduce<Record<string, number>>((acc, item) => {
        acc[item.menuItemId] = item.quantity
        return acc
      }, {}),
    [basket.basketItems],
  )

  const orderedMenuItemIds = React.useMemo(
    () => new Set(bootstrap?.tableOrderedMenuItemIds || []),
    [bootstrap?.tableOrderedMenuItemIds],
  )

  const popularItems = React.useMemo(() => {
    const flattened = catalog.flatMap((category) => category.items)

    return [...flattened]
      .sort(
        (a, b) =>
          Number(b.popularity || 0) - Number(a.popularity || 0) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 6)
  }, [catalog])

  React.useEffect(() => {
    if (!catalog.length) {
      setSelectedCategoryId(popularItems.length ? POPULAR_TAB_KEY : ALL_TAB_KEY)
      return
    }

    setSelectedCategoryId((current) =>
      current &&
      (current === POPULAR_TAB_KEY ||
        current === ALL_TAB_KEY ||
        catalog.some((category) => category.id === current))
        ? current
        : popularItems.length
          ? POPULAR_TAB_KEY
          : ALL_TAB_KEY,
    )
  }, [catalog, popularItems.length])

  const handleSelectCategory = React.useCallback((id: string) => {
    setSelectedCategoryId(id)
    categoryRefs.current[id]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [])

  const handleAddItem = React.useCallback(
    (item: GuestCatalogItem) => {
      if (isSessionEnded || lockReason) {
        toast.error(getGuestSessionUiState(lockReason || 'session_revoked').description)
        return
      }

      basket.addItem({
        id: item.id,
        name: item.name,
        price: item.price,
      })
      setAnimatedItemId(item.id)

      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current)
      }

      animationTimeoutRef.current = window.setTimeout(() => {
        setAnimatedItemId(null)
      }, 180)
    },
    [basket, isSessionEnded, lockReason],
  )

  const submitOrder = React.useCallback(async () => {
    if (!guestToken || isSessionEnded || lockReason) {
      toast.error(getGuestSessionUiState(lockReason || 'session_revoked').description)
      return
    }

    if (invalidBasketItems.length > 0) {
      toast.error('Sepette artık sunulmayan ürünler var. Lütfen sepeti düzenleyin.')
      setActiveTab('cart')
      return
    }

    try {
      const latestCatalog = await guestApi.getCatalog(guestToken)
      applyServerTime(latestCatalog.serverTime)
      setCatalog(latestCatalog.catalog)

      const refreshedIds = new Set(
        latestCatalog.catalog.flatMap((category) =>
          category.items.map((item) => item.id),
        ),
      )

      const stillInvalid = basket.basketItems.some(
        (item) => !refreshedIds.has(item.menuItemId),
      )

      if (stillInvalid) {
        toast.error('Menü güncellendi. Uygun olmayan ürünleri sepetten kaldırın.')
        setActiveTab('cart')
        return
      }

      const submittedOrder = await basket.submitOrder()

      if (!submittedOrder?.id) {
        toast.error('Sipariş gönderilemedi. Lütfen tekrar deneyin.')
        return
      }

      upsertPendingOrder(submittedOrder)
      setBootstrap((current) => {
        if (!current) {
          return current
        }

        const nextOrders = [
          submittedOrder,
          ...current.sessionOrders.filter((order) => order.id !== submittedOrder.id),
        ]

        return {
          ...current,
          sessionOrders: nextOrders,
        }
      })

      toast.success('Siparişiniz onaya gönderildi.')
      setActiveTab('orders')
      await loadBootstrap(guestToken, false)
    } catch (error) {
      if (isGuestSessionInvalidError(error)) {
        handleSessionInvalidation('session_revoked')
        return
      }

      console.error('[Guest] Submit order failed:', error)
      toast.error('Sipariş gönderilemedi. Lütfen tekrar deneyin.')
    }
  }, [
    applyServerTime,
    basket,
    guestToken,
    handleSessionInvalidation,
    invalidBasketItems.length,
    isSessionEnded,
    loadBootstrap,
    lockReason,
    upsertPendingOrder,
  ])

  const handleGuestRequest = React.useCallback(
    async (type: 'waiter' | 'bill', note?: string) => {
      if (!guestToken || isSessionEnded || lockReason) {
        toast.error(getGuestSessionUiState(lockReason || 'session_revoked').description)
        return
      }

      try {
        const response =
          type === 'waiter'
            ? await guestApi.callWaiter(
                guestToken,
                note?.trim() ? { reason: note.trim() } : {},
              )
            : await guestApi.requestBill(guestToken)

        applyServerTime(response.serverTime)

        if (type === 'waiter') {
          setWaiterCooldownUntil(response.nextAllowedAt)
        } else {
          setBillCooldownUntil(response.nextAllowedAt)
        }

        toast.success(
          response.deduped
            ? 'Talebiniz zaten iletildi.'
            : type === 'waiter'
              ? 'Garson çağrınız iletildi.'
              : 'Hesap isteğiniz iletildi.',
        )
      } catch (error) {
        if (isGuestSessionInvalidError(error)) {
          handleSessionInvalidation('session_revoked')
          return
        }

        console.error('[Guest] Request failed:', error)
        toast.error('İstek gönderilemedi. Lütfen tekrar deneyin.')
      }
    },
    [applyServerTime, guestToken, handleSessionInvalidation, isSessionEnded, lockReason],
  )

  const getRemainingSeconds = React.useCallback((value: string | null) => {
    if (!value) {
      return 0
    }

    const diff = new Date(value).getTime() - getNow().getTime()
    return diff > 0 ? Math.ceil(diff / 1000) : 0
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Misafir ekranı yükleniyor...
      </div>
    )
  }

  if (errorMessage && !bootstrap) {
    const uiState = getGuestSessionUiState(lockReason || 'session_revoked')
    return <GuestLockScreen title={uiState.title} description={errorMessage} />
  }

  if (!bootstrap) {
    const uiState = getGuestSessionUiState(lockReason || 'session_revoked')
    return (
      <GuestLockScreen
        title={uiState.title}
        description={
          errorMessage || uiState.description || 'Misafir oturumu başlatılamadı.'
        }
      />
    )
  }

  const orderBadgeCount = getOrderBadgeCount(bootstrap.sessionOrders)
  const waiterRemaining = getRemainingSeconds(waiterCooldownUntil)
  const billRemaining = getRemainingSeconds(billCooldownUntil)
  const pulseCart = animatedItemId !== null
  const bannerContent =
    isSessionEnded || isSyncing ? (
      <>
        {isSessionEnded ? (
          <GuestStatusBanner
            variant="danger"
            icon="danger"
            title="Oturum Sonlandırıldı"
            description={
              errorMessage || 'Bu masa oturumu sona erdi. Lütfen QR kodu yeniden okutun.'
            }
          />
        ) : null}

        {isSyncing ? (
          <GuestStatusBanner
            compact
            icon="refresh"
            title="Veriler yenileniyor"
            description="Menü ve masa durumu arka planda güncelleniyor."
          />
        ) : null}
      </>
    ) : null

  let activeContent: React.ReactNode

  if (activeTab === 'menu') {
    activeContent = (
      <GuestMenuView
        categories={catalog}
        popularItems={popularItems}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
        onIncrementItem={handleAddItem}
        onDecrementItem={(item) => {
          if ((quantitiesByItemId[item.id] || 0) > 0) {
            basket.changeQuantity(item.id, -1)
          }
        }}
        quantitiesByItemId={quantitiesByItemId}
        animatedItemId={animatedItemId}
        isSessionEnded={isSessionEnded}
        categoryRefs={categoryRefs}
        orderedMenuItemIds={orderedMenuItemIds}
      />
    )
  } else if (activeTab === 'orders') {
    activeContent = <GuestOrdersView orders={bootstrap.sessionOrders} />
  } else if (activeTab === 'cart') {
    activeContent = (
      <GuestCartView
        basket={basket}
        invalidMenuItemIds={invalidMenuItemIds}
        isSessionEnded={isSessionEnded}
        onSubmit={submitOrder}
        otherGuestSummary={bootstrap.tableGuestOrderSummary}
      />
    )
  } else {
    activeContent = (
      <GuestAccountView
        items={bootstrap.tableBill.items}
        totalAmount={bootstrap.tableBill.totalAmount}
        billRemaining={billRemaining}
        waiterRemaining={waiterRemaining}
        isSessionEnded={isSessionEnded}
        onBillRequest={async () => handleGuestRequest('bill')}
        onWaiterRequest={async (note) => handleGuestRequest('waiter', note)}
      />
    )
  }

  return (
    <GuestShell
      header={
        <GuestHeader
          restaurantName={bootstrap.restaurant.name}
          tableName={bootstrap.table.name}
          cartCount={basket.basketItems.length}
          onCartClick={() => setActiveTab('cart')}
          pulseCart={pulseCart}
        />
      }
      banner={bannerContent}
      footer={
        <GuestBottomNav
          activeTab={activeTab}
          onChange={setActiveTab}
          cartCount={basket.basketItems.length}
          orderCount={orderBadgeCount}
          pulseCart={pulseCart}
        />
      }
    >
      {activeContent}
    </GuestShell>
  )
}
