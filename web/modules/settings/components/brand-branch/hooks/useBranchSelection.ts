'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CreateRestaurantInput, Restaurant } from '@/modules/restaurants/types'
import { brandBranchService } from '@/modules/settings/services/brand-branch.service'
import { slugify } from '../types'

interface UseBranchSelectionParams {
  canManageBranch: boolean
  selectedBranchId: string
  setQuery: (patch: Record<string, string | null | undefined>) => void
}

export function useBranchSelection({
  canManageBranch,
  selectedBranchId,
  setQuery,
}: UseBranchSelectionParams) {
  const [branches, setBranches] = useState<Restaurant[]>([])
  const [isBranchLoading, setIsBranchLoading] = useState(false)

  const loadBranches = useCallback(async () => {
    setIsBranchLoading(true)
    try {
      const response = await brandBranchService.getBranches()
      setBranches(response)

      const hasSelected = response.some((item) => item.id === selectedBranchId)
      if (!hasSelected && response.length > 0) {
        setQuery({ branchId: response[0].id })
      }
    } catch {
      toast.error('Şube listesi alınamadı')
    } finally {
      setIsBranchLoading(false)
    }
  }, [selectedBranchId, setQuery])

  const createBranch = useCallback(
    async (payload: CreateRestaurantInput): Promise<Restaurant> => {
      const created = await brandBranchService.createBranch({
        ...payload,
        slug: slugify(payload.slug || payload.name),
      })
      await loadBranches()
      return created
    },
    [loadBranches],
  )

  useEffect(() => {
    if (!canManageBranch) return
    void loadBranches()
  }, [canManageBranch, loadBranches])

  const selectedBranch = useMemo(
    () => branches.find((item) => item.id === selectedBranchId) || null,
    [branches, selectedBranchId],
  )

  return {
    branches,
    isBranchLoading,
    selectedBranch,
    loadBranches,
    createBranch,
  }
}

