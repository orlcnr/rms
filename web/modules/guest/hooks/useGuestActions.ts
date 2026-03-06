'use client'

import React from 'react'
import { toast } from 'sonner'
import { guestApi, isGuestSessionInvalidError } from '../service'
import { getGuestSessionUiState } from '../session-ui-config'
import { GuestCatalogCategory, GuestOrder, GuestTabKey } from '../types'
import { useGuestBasket } from './useGuestBasket'
import type { UseGuestBootstrapResult } from './useGuestBootstrap'

interface UseGuestActionsOptions {
  guestToken: string | null
  lockReason: string | null
  isSessionEnded: boolean
  invalidBasketItemsLength: number
  basket: ReturnType<typeof useGuestBasket>
  setCatalog: React.Dispatch<React.SetStateAction<GuestCatalogCategory[]>>
  setActiveTab: React.Dispatch<React.SetStateAction<GuestTabKey>>
  setWaiterCooldownUntil: React.Dispatch<React.SetStateAction<string | null>>
  setBillCooldownUntil: React.Dispatch<React.SetStateAction<string | null>>
  setBootstrap: UseGuestBootstrapResult['setBootstrap']
  loadBootstrap: (token: string, hydrateDraft?: boolean) => Promise<unknown>
  handleSessionInvalidation: (reason: string) => void
  applyServerTime: (serverTime: string) => void
  upsertPendingOrder: (order: GuestOrder) => void
}

export interface UseGuestActionsResult {
  submitOrder: () => Promise<void>
  handleGuestRequest: (type: 'waiter' | 'bill', note?: string) => Promise<void>
}

export function useGuestActions({
  guestToken,
  lockReason,
  isSessionEnded,
  invalidBasketItemsLength,
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
}: UseGuestActionsOptions): UseGuestActionsResult {
  const submitOrder = React.useCallback(async () => {
    if (!guestToken || isSessionEnded || lockReason) {
      toast.error(getGuestSessionUiState(lockReason || 'session_revoked').description)
      return
    }

    if (invalidBasketItemsLength > 0) {
      toast.error('Sepette artık sunulmayan ürünler var. Lütfen sepeti düzenleyin.')
      setActiveTab('cart')
      return
    }

    try {
      const latestCatalog = await guestApi.getCatalog(guestToken)
      applyServerTime(latestCatalog.serverTime)
      setCatalog(latestCatalog.catalog)

      const refreshedIds = new Set(
        latestCatalog.catalog.flatMap((category) => category.items.map((item) => item.id)),
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
    invalidBasketItemsLength,
    isSessionEnded,
    loadBootstrap,
    lockReason,
    setActiveTab,
    setBootstrap,
    setCatalog,
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
    [
      applyServerTime,
      guestToken,
      handleSessionInvalidation,
      isSessionEnded,
      lockReason,
      setBillCooldownUntil,
      setWaiterCooldownUntil,
    ],
  )

  return {
    submitOrder,
    handleGuestRequest,
  }
}
