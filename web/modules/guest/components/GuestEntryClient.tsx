'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { getNow } from '@/modules/shared/utils/date'
import { resolveDisplayPrice } from '@/modules/shared/utils/pricing'
import { useGuestActions } from '../hooks/useGuestActions'
import { useGuestBasket } from '../hooks/useGuestBasket'
import { upsertPendingOrder, useGuestBootstrap } from '../hooks/useGuestBootstrap'
import { useGuestSession } from '../hooks/useGuestSession'
import { useGuestSocket } from '../hooks/useGuestSocket'
import type {
  GuestBootstrapResponse,
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

function getOrderBadgeCount(sessionOrders: GuestBootstrapResponse['sessionOrders']) {
  return sessionOrders.filter((order) => {
    const status = order.status.toUpperCase()
    return status !== 'APPROVED' && status !== 'REJECTED' && status !== 'CONVERTED'
  }).length
}

interface GuestEntryClientProps {
  qrToken?: string
}

function extractQrTokenFromLocation(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const readFromParams = (value?: string | null) =>
    value && value.trim().length > 0 ? value : undefined

  const currentUrl = new URL(window.location.href)
  const tokenFromSearch =
    readFromParams(currentUrl.searchParams.get('token')) ||
    readFromParams(currentUrl.searchParams.get('qrToken')) ||
    readFromParams(currentUrl.searchParams.get('qr')) ||
    readFromParams(currentUrl.searchParams.get('t'))

  if (tokenFromSearch) {
    return tokenFromSearch
  }

  if (currentUrl.hash) {
    const hash = currentUrl.hash.replace(/^#/, '')
    const hashQuery = hash.includes('?') ? hash.split('?')[1] : hash
    const hashParams = new URLSearchParams(hashQuery)
    const tokenFromHash =
      readFromParams(hashParams.get('token')) ||
      readFromParams(hashParams.get('qrToken')) ||
      readFromParams(hashParams.get('qr')) ||
      readFromParams(hashParams.get('t'))

    if (tokenFromHash) {
      return tokenFromHash
    }
  }

  const pathSegments = currentUrl.pathname.split('/').filter(Boolean)

  if (pathSegments.length >= 2 && pathSegments[0] === 'guest') {
    return decodeURIComponent(pathSegments[1])
  }

  return undefined
}

export function GuestEntryClient({ qrToken }: GuestEntryClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fallbackQrToken, setFallbackQrToken] = React.useState<string | undefined>(undefined)
  const [guestToken, setGuestToken] = React.useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<GuestTabKey>('menu')
  const [animatedItemId, setAnimatedItemId] = React.useState<string | null>(null)
  const runtimeQrToken =
    typeof window !== 'undefined' ? extractQrTokenFromLocation() : undefined

  const resolvedQrToken =
    qrToken ||
    searchParams.get('token') ||
    searchParams.get('qrToken') ||
    searchParams.get('qr') ||
    searchParams.get('t') ||
    runtimeQrToken ||
    fallbackQrToken ||
    undefined

  const handleSessionInvalidationRef = React.useRef<(reason: string) => void>(() => undefined)
  const setActiveSessionIdRef = React.useRef<(sessionId: string | null) => void>(() => undefined)
  const clearLockRef = React.useRef<() => void>(() => undefined)
  const resetBasketRef = React.useRef<() => void>(() => undefined)
  const hydrateDraftRef = React.useRef<(order: GuestOrder | null) => void>(() => undefined)
  const handleBootstrapSessionInvalidation = React.useCallback((reason: string) => {
    handleSessionInvalidationRef.current(reason)
  }, [])
  const handleBootstrapSessionIdChange = React.useCallback((sessionId: string | null) => {
    setActiveSessionIdRef.current(sessionId)
  }, [])
  const handleBootstrapClearLock = React.useCallback(() => {
    clearLockRef.current()
  }, [])
  const handleBootstrapHydrateDraft = React.useCallback((order: GuestOrder | null) => {
    hydrateDraftRef.current(order)
  }, [])
  const resetBasketSafely = React.useCallback(() => {
    resetBasketRef.current()
  }, [])

  const {
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
  } = useGuestBootstrap({
    guestToken,
    onSessionInvalidation: handleBootstrapSessionInvalidation,
    onSessionIdChange: handleBootstrapSessionIdChange,
    onClearLock: handleBootstrapClearLock,
    onHydrateDraft: handleBootstrapHydrateDraft,
  })

  const clearBootstrapState = React.useCallback(() => {
    setBootstrap(null)
    setCatalog([])
    setWaiterCooldownUntil(null)
    setBillCooldownUntil(null)
    setSelectedCategoryId(null)
    setActiveTab('menu')
  }, [setBillCooldownUntil, setBootstrap, setCatalog, setWaiterCooldownUntil])

  const {
    activeSessionId,
    isLoading,
    isSessionEnded,
    errorMessage,
    lockReason,
    handleSessionInvalidation,
    clearLockState,
    setActiveSessionIdSafe,
  } = useGuestSession({
    resolvedQrToken,
    router,
    loadBootstrap,
    bootstrapSessionId: bootstrap?.session.id,
    clearBootstrapState,
    resetBasket: resetBasketSafely,
    onHydrateDraft: hydrateDraftRef,
    guestToken,
    setGuestToken,
  })

  React.useEffect(() => {
    handleSessionInvalidationRef.current = handleSessionInvalidation
    setActiveSessionIdRef.current = setActiveSessionIdSafe
    clearLockRef.current = clearLockState
  }, [clearLockState, handleSessionInvalidation, setActiveSessionIdSafe])

  const basketStorageKey = activeSessionId ? `guest-basket:${activeSessionId}` : null

  const basket = useGuestBasket({
    token: guestToken,
    initialDraftOrder: null,
    storageKey: basketStorageKey,
  })

  const animationTimeoutRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    resetBasketRef.current = basket.reset
    hydrateDraftRef.current = basket.hydrateDraft
  }, [basket.hydrateDraft, basket.reset])

  React.useEffect(() => {
    if (resolvedQrToken) {
      return
    }

    setFallbackQrToken(extractQrTokenFromLocation())
  }, [resolvedQrToken])

  React.useEffect(
    () => () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current)
      }
    },
    [],
  )

  const handleSessionRevoked = React.useCallback(
    (reason: string) => {
      handleSessionInvalidation(reason)
    },
    [handleSessionInvalidation],
  )

  const handleOrderStatusChanged = React.useCallback(() => {
    scheduleBootstrapRefresh()
  }, [scheduleBootstrapRefresh])

  const handleTableRefresh = React.useCallback(() => {
    scheduleBootstrapRefresh()
  }, [scheduleBootstrapRefresh])

  useGuestSocket({
    token: guestToken,
    onSessionRevoked: handleSessionRevoked,
    onOrderStatusChanged: handleOrderStatusChanged,
    onTableRefresh: handleTableRefresh,
  })

  const availableIds = React.useMemo(
    () => new Set(catalog.flatMap((category) => category.items.map((item) => item.id))),
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

  const categoryRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})

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

      // Branch contextte sepete effective fiyat yazılır (override ?? base).
      // Draft/submit akışında backend bu birim fiyatı unitPrice olarak kilitler.
      const effectiveUnitPrice = resolveDisplayPrice(item, { branchContext: true })

      basket.addItem({
        id: item.id,
        name: item.name,
        price: effectiveUnitPrice,
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

  const { submitOrder, handleGuestRequest } = useGuestActions({
    guestToken,
    lockReason,
    isSessionEnded,
    invalidBasketItemsLength: invalidBasketItems.length,
    basket,
    setCatalog,
    setActiveTab,
    setWaiterCooldownUntil,
    setBillCooldownUntil,
    setBootstrap,
    loadBootstrap,
    handleSessionInvalidation,
    applyServerTime,
    upsertPendingOrder,
  })

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
        description={errorMessage || uiState.description || 'Misafir oturumu başlatılamadı.'}
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
