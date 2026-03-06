'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  brandBranchService,
  BranchManagedMenuItem,
} from '@/modules/settings/services/brand-branch.service'
import { BrandBranchStep, DEFAULT_LIMIT } from '../types'

interface UseBranchItemsParams {
  canManageBranch: boolean
  selectedBranchId: string
  step: BrandBranchStep
  page: number
  limit: number
  search: string
  categoryId: string
  visibility: 'all' | 'visible' | 'hidden'
  overrideOnly: boolean
}

export function useBranchItems({
  canManageBranch,
  selectedBranchId,
  step,
  page,
  limit,
  search,
  categoryId,
  visibility,
  overrideOnly,
}: UseBranchItemsParams) {
  const [items, setItems] = useState<BranchManagedMenuItem[]>([])
  const [itemsMeta, setItemsMeta] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: DEFAULT_LIMIT,
  })
  const [isItemsLoading, setIsItemsLoading] = useState(false)
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({})
  const [pendingRowActions, setPendingRowActions] = useState<Record<string, boolean>>({})
  const [pendingPriceActions, setPendingPriceActions] = useState<Record<string, boolean>>({})

  const mergeIncomingItems = useCallback(
    (
      previousItems: BranchManagedMenuItem[],
      incomingItems: BranchManagedMenuItem[],
    ): BranchManagedMenuItem[] => {
      const previousById = new Map(previousItems.map((item) => [item.id, item]))

      return incomingItems.map((incomingItem) => {
        const previousItem = previousById.get(incomingItem.id)
        if (!previousItem) {
          return incomingItem
        }

        const isRowPending = Boolean(pendingRowActions[incomingItem.id])
        const isPricePending = Boolean(pendingPriceActions[incomingItem.id])
        if (!isRowPending && !isPricePending) {
          return incomingItem
        }

        const mergedOverride =
          incomingItem.override || previousItem.override
            ? ({
                ...(incomingItem.override || {}),
                ...(previousItem.override || {}),
              } as BranchManagedMenuItem['override'])
            : undefined

        const mergedItem: BranchManagedMenuItem = {
          ...incomingItem,
          ...(mergedOverride ? { override: mergedOverride } : {}),
        }

        if (isPricePending) {
          const previousEffectivePrice = Number(previousItem.effective_price ?? previousItem.price)
          if (Number.isFinite(previousEffectivePrice)) {
            mergedItem.effective_price = previousEffectivePrice
            mergedItem.price = previousEffectivePrice
          }
        }

        return mergedItem
      })
    },
    [pendingPriceActions, pendingRowActions],
  )

  const loadItems = useCallback(async () => {
    if (!selectedBranchId || step !== 'overrides') return

    setIsItemsLoading(true)
    try {
      const response = await brandBranchService.getBranchItemsForManagement(
        selectedBranchId,
        {
          page,
          limit,
          search: search || undefined,
          categoryId: categoryId || undefined,
          visibility,
          overrideOnly: overrideOnly || undefined,
        },
      )

      setItems((previousItems) => mergeIncomingItems(previousItems, response.items))
      setItemsMeta({
        currentPage: response.meta.currentPage,
        totalPages: response.meta.totalPages,
        totalItems: response.meta.totalItems,
        itemsPerPage: response.meta.itemsPerPage,
      })

      setCustomPrices((prev) => {
        const next = { ...prev }
        response.items.forEach((item) => {
          if (pendingPriceActions[item.id]) {
            return
          }
          next[item.id] =
            item.override?.custom_price !== null && item.override?.custom_price !== undefined
              ? String(item.override.custom_price)
              : ''
        })
        return next
      })
    } catch {
      toast.error('Şube ürün listesi alınamadı')
    } finally {
      setIsItemsLoading(false)
    }
  }, [
    categoryId,
    limit,
    mergeIncomingItems,
    overrideOnly,
    page,
    pendingPriceActions,
    search,
    selectedBranchId,
    step,
    visibility,
  ])

  useEffect(() => {
    if (!canManageBranch || !selectedBranchId || step !== 'overrides') return
    void loadItems()
  }, [canManageBranch, selectedBranchId, step, loadItems])

  const handleSaveCustomPrice = useCallback(
    async (menuItemId: string) => {
      if (!selectedBranchId || !canManageBranch) return false

      const rawPrice = customPrices[menuItemId]
      const parsed = rawPrice ? Number(rawPrice) : Number.NaN

      if (!Number.isFinite(parsed)) {
        toast.error('Lütfen geçerli bir custom price girin')
        return false
      }

      setPendingPriceActions((state) => ({ ...state, [menuItemId]: true }))
      try {
        await brandBranchService.upsertMenuOverride(selectedBranchId, menuItemId, {
          custom_price: parsed,
        })
        await loadItems()
        toast.success('Custom price kaydedildi')
        return true
      } catch {
        toast.error('Custom price kaydedilemedi')
        return false
      } finally {
        setPendingPriceActions((state) => ({ ...state, [menuItemId]: false }))
      }
    },
    [canManageBranch, customPrices, loadItems, selectedBranchId],
  )

  const handleToggleRowHidden = useCallback(
    async (item: BranchManagedMenuItem) => {
      if (!selectedBranchId || !canManageBranch) return false

      const isHidden = Boolean(item.override?.is_hidden)
      const nextHidden = !isHidden
      const previous = item

      setPendingRowActions((state) => ({ ...state, [item.id]: true }))
      setItems((state) => {
        const shouldRemoveFromCurrentView =
          (visibility === 'visible' && nextHidden) ||
          (visibility === 'hidden' && !nextHidden)

        if (shouldRemoveFromCurrentView) {
          return state.filter((row) => row.id !== item.id)
        }

        return state.map((row) =>
          row.id === item.id
            ? {
                ...row,
                override: {
                  is_hidden: nextHidden,
                  custom_price: nextHidden ? null : row.override?.custom_price ?? null,
                },
              }
            : row,
        )
      })

      try {
        if (nextHidden) {
          await brandBranchService.upsertMenuOverride(selectedBranchId, item.id, {})
        } else {
          await brandBranchService.bulkMenuOverrides(selectedBranchId, {
            itemIds: [item.id],
            operation: 'unhide',
          })
        }
        toast.success(nextHidden ? 'Ürün gizlendi' : 'Ürün tekrar görünür oldu')
        return true
      } catch {
        setItems((state) => {
          const exists = state.some((row) => row.id === item.id)
          if (exists) {
            return state.map((row) => (row.id === item.id ? previous : row))
          }
          return [previous, ...state]
        })
        toast.error('Ürün görünürlüğü güncellenemedi')
        return false
      } finally {
        setPendingRowActions((state) => ({ ...state, [item.id]: false }))
      }
    },
    [canManageBranch, selectedBranchId, visibility],
  )

  const handleRemoveOverride = useCallback(
    async (menuItemId: string) => {
      if (!selectedBranchId || !canManageBranch) return false

      setPendingPriceActions((state) => ({ ...state, [menuItemId]: true }))
      try {
        await brandBranchService.deleteMenuOverride(selectedBranchId, menuItemId)
        await loadItems()
        toast.success('Override kaldırıldı')
        return true
      } catch {
        toast.error('Override kaldırılamadı')
        return false
      } finally {
        setPendingPriceActions((state) => ({ ...state, [menuItemId]: false }))
      }
    },
    [canManageBranch, loadItems, selectedBranchId],
  )

  return {
    items,
    setItems,
    itemsMeta,
    isItemsLoading,
    customPrices,
    setCustomPrices,
    pendingRowActions,
    pendingPriceActions,
    loadItems,
    handleSaveCustomPrice,
    handleToggleRowHidden,
    handleRemoveOverride,
  }
}
