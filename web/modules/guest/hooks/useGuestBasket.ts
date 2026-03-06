'use client'

import React from 'react'
import { GuestBasketItem, GuestOrder } from '../types'
import { guestApi } from '../service'

interface UseGuestBasketOptions {
  token: string | null
  initialDraftOrder: GuestOrder | null
  storageKey: string | null
}

interface PersistedGuestBasket {
  items: GuestBasketItem[]
  updatedAt: string
}

function mapDraftToBasket(order: GuestOrder | null): GuestBasketItem[] {
  if (!order) {
    return []
  }

  return order.items.map((item) => ({
    menuItemId: item.menuItemId,
    name: item.name,
    unitPrice: Number(item.unitPrice),
    quantity: Number(item.quantity),
  }))
}

function getDraftUpdatedAt(order: GuestOrder | null): string | null {
  if (!order) {
    return null
  }

  return order.updated_at || order.created_at || null
}

function readPersistedBasket(storageKey: string | null): PersistedGuestBasket | null {
  if (typeof window === 'undefined' || !storageKey) {
    return null
  }

  const raw = window.sessionStorage.getItem(storageKey)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedGuestBasket>

    if (!Array.isArray(parsed.items) || typeof parsed.updatedAt !== 'string') {
      return null
    }

    return {
      items: parsed.items.map((item) => ({
        menuItemId: String(item.menuItemId),
        name: String(item.name),
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
      })),
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

function clearPersistedBasket(storageKey: string | null) {
  if (typeof window === 'undefined' || !storageKey) {
    return
  }

  window.sessionStorage.removeItem(storageKey)
}

export function useGuestBasket({
  token,
  initialDraftOrder,
  storageKey,
}: UseGuestBasketOptions) {
  const [basketItems, setBasketItems] = React.useState<GuestBasketItem[]>(
    mapDraftToBasket(initialDraftOrder),
  )
  const [activeDraftOrderId, setActiveDraftOrderId] = React.useState<string | null>(
    initialDraftOrder?.id || null,
  )
  const [updatedAt, setUpdatedAt] = React.useState<string>(
    getDraftUpdatedAt(initialDraftOrder) || new Date().toISOString(),
  )
  const [isSavingDraft, setIsSavingDraft] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [hasHydrated, setHasHydrated] = React.useState(false)

  React.useEffect(() => {
    if (!hasHydrated) {
      return
    }

    if (!storageKey) {
      return
    }

    if (!basketItems.length) {
      clearPersistedBasket(storageKey)
      return
    }

    const payload: PersistedGuestBasket = {
      items: basketItems,
      updatedAt,
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(payload))
  }, [basketItems, hasHydrated, storageKey, updatedAt])

  const touch = React.useCallback(() => {
    setUpdatedAt(new Date().toISOString())
  }, [])

  const addItem = React.useCallback((item: {
    id: string
    name: string
    price: number
  }) => {
    // Caller passes branch-effective unit price (override ?? base).
    // Once sent to backend, this gets locked as order item unitPrice snapshot.
    const effectiveUnitPrice = Number(item.price)

    setBasketItems((current) => {
      const existing = current.find((entry) => entry.menuItemId === item.id)

      if (!existing) {
        return [
          ...current,
          {
            menuItemId: item.id,
            name: item.name,
            unitPrice: effectiveUnitPrice,
            quantity: 1,
          },
        ]
      }

      return current.map((entry) =>
        entry.menuItemId === item.id
          ? { ...entry, quantity: entry.quantity + 1 }
          : entry,
      )
    })
    touch()
  }, [touch])

  const changeQuantity = React.useCallback((menuItemId: string, delta: number) => {
    setBasketItems((current) =>
      current
        .map((entry) =>
          entry.menuItemId === menuItemId
            ? { ...entry, quantity: entry.quantity + delta }
            : entry,
        )
        .filter((entry) => entry.quantity > 0),
    )
    touch()
  }, [touch])

  const removeItem = React.useCallback((menuItemId: string) => {
    setBasketItems((current) =>
      current.filter((entry) => entry.menuItemId !== menuItemId),
    )
    touch()
  }, [touch])

  const syncDraft = React.useCallback(async () => {
    if (!token || (basketItems.length === 0 && !activeDraftOrderId)) {
      return null
    }

    setIsSavingDraft(true)

    try {
      const payload = {
        items: basketItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
      }

      const response = activeDraftOrderId
        ? await guestApi.updateDraftOrder(token, activeDraftOrderId, payload)
        : await guestApi.createDraftOrder(token, payload)

      setActiveDraftOrderId(response.id)
      setUpdatedAt(response.updated_at || new Date().toISOString())
      return response
    } finally {
      setIsSavingDraft(false)
    }
  }, [activeDraftOrderId, basketItems, token])

  const submitOrder = React.useCallback(async () => {
    if (!token || basketItems.length === 0) {
      return null
    }

    setIsSubmitting(true)

    try {
      const draft = await syncDraft()

      if (!draft?.id) {
        return null
      }

      const response = await guestApi.submitDraftOrder(token, draft.id)
      setActiveDraftOrderId(null)
      setBasketItems([])
      clearPersistedBasket(storageKey)
      setUpdatedAt(new Date().toISOString())
      return response
    } finally {
      setIsSubmitting(false)
    }
  }, [basketItems.length, storageKey, syncDraft, token])

  const totalAmount = React.useMemo(
    () =>
      basketItems.reduce(
        (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
        0,
      ),
    [basketItems],
  )

  const hydrateDraft = React.useCallback((order: GuestOrder | null) => {
    const persisted = readPersistedBasket(storageKey)
    const draftUpdatedAt = getDraftUpdatedAt(order)

    if (!persisted && !order) {
      setBasketItems([])
      setActiveDraftOrderId(null)
      setUpdatedAt(new Date().toISOString())
      clearPersistedBasket(storageKey)
      setHasHydrated(true)
      return
    }

    if (persisted && !order) {
      setBasketItems(persisted.items)
      setActiveDraftOrderId(null)
      setUpdatedAt(persisted.updatedAt)
      setHasHydrated(true)
      return
    }

    if (!persisted && order) {
      setBasketItems(mapDraftToBasket(order))
      setActiveDraftOrderId(order.id)
      setUpdatedAt(draftUpdatedAt || new Date().toISOString())
      setHasHydrated(true)
      return
    }

    if (!persisted || !order) {
      return
    }

    if (draftUpdatedAt && persisted.updatedAt < draftUpdatedAt) {
      setBasketItems(mapDraftToBasket(order))
      setActiveDraftOrderId(order.id)
      setUpdatedAt(draftUpdatedAt)
      setHasHydrated(true)
      return
    }

    setBasketItems(persisted.items)
    setActiveDraftOrderId(order.id)
    setUpdatedAt(persisted.updatedAt)
    setHasHydrated(true)
  }, [storageKey])

  const reset = React.useCallback(() => {
    setBasketItems([])
    setActiveDraftOrderId(null)
    setUpdatedAt(new Date().toISOString())
    setHasHydrated(false)
    clearPersistedBasket(storageKey)
  }, [storageKey])

  return {
    basketItems,
    activeDraftOrderId,
    isSavingDraft,
    isSubmitting,
    totalAmount,
    addItem,
    changeQuantity,
    removeItem,
    syncDraft,
    submitOrder,
    hydrateDraft,
    reset,
  }
}
