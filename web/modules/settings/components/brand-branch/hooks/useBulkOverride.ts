'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  brandBranchService,
  BranchBulkOperation,
} from '@/modules/settings/services/brand-branch.service'
import { BulkJobState } from '../types'

interface UseBulkOverrideParams {
  selectedBranchId: string
  loadItems: () => Promise<void>
}

const VALUE_REQUIRED_OPERATIONS: BranchBulkOperation[] = [
  'set_price',
  'increase_amount',
  'decrease_amount',
  'increase_percent',
  'decrease_percent',
]

export function useBulkOverride({
  selectedBranchId,
  loadItems,
}: UseBulkOverrideParams) {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [bulkOperation, setBulkOperation] = useState<BranchBulkOperation>('set_price')
  const [bulkValue, setBulkValue] = useState('')
  const [isBulkApplying, setIsBulkApplying] = useState(false)
  const [bulkJobState, setBulkJobState] = useState<BulkJobState | null>(null)

  const valueRequired = useMemo(
    () => new Set<BranchBulkOperation>(VALUE_REQUIRED_OPERATIONS),
    [],
  )

  const failedSet = useMemo(
    () => new Set(bulkJobState?.failedIds || []),
    [bulkJobState],
  )

  const handleBulkApply = useCallback(async () => {
    if (!selectedBranchId || selectedItemIds.size === 0) return false

    const needValue = valueRequired.has(bulkOperation)
    const parsed = Number(bulkValue)

    if (needValue && !Number.isFinite(parsed)) {
      toast.error('Bu işlem için geçerli bir değer girmelisiniz')
      return false
    }

    setIsBulkApplying(true)
    try {
      const result = await brandBranchService.bulkMenuOverrides(selectedBranchId, {
        itemIds: Array.from(selectedItemIds),
        operation: bulkOperation,
        ...(needValue ? { value: parsed } : {}),
      })

      setBulkJobState({
        operation: bulkOperation,
        ...(needValue ? { value: parsed } : {}),
        failedIds: result.failedIds,
        errorsById: result.errorsById || {},
      })

      await loadItems()
      setSelectedItemIds(new Set())

      const successCount = result.affectedCount
      if (result.failedIds.length) {
        toast.error(`${successCount} başarılı, ${result.failedIds.length} başarısız`)
      } else {
        toast.success(`${result.affectedCount} ürün güncellendi`)
      }
      return true
    } catch {
      toast.error('Toplu işlem başarısız')
      return false
    } finally {
      setIsBulkApplying(false)
    }
  }, [bulkOperation, bulkValue, loadItems, selectedBranchId, selectedItemIds, valueRequired])

  const handleRetryBulkForItem = useCallback(
    async (itemId: string) => {
      if (!selectedBranchId || !bulkJobState) return false

      try {
        await brandBranchService.bulkMenuOverrides(selectedBranchId, {
          itemIds: [itemId],
          operation: bulkJobState.operation,
          ...(bulkJobState.value !== undefined ? { value: bulkJobState.value } : {}),
        })

        setBulkJobState((state) => {
          if (!state) return state
          const nextFailed = state.failedIds.filter((id) => id !== itemId)
          const nextErrors = { ...state.errorsById }
          delete nextErrors[itemId]
          return {
            ...state,
            failedIds: nextFailed,
            errorsById: nextErrors,
          }
        })

        await loadItems()
        toast.success('Satır tekrar denendi')
        return true
      } catch {
        toast.error('Satır tekrar deneme başarısız')
        return false
      }
    },
    [bulkJobState, loadItems, selectedBranchId],
  )

  return {
    selectedItemIds,
    setSelectedItemIds,
    bulkOperation,
    setBulkOperation,
    bulkValue,
    setBulkValue,
    isBulkApplying,
    bulkJobState,
    failedSet,
    valueRequired,
    handleBulkApply,
    handleRetryBulkForItem,
  }
}

