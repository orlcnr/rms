'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  brandBranchService,
  BranchCategoryVisibilityItem,
} from '@/modules/settings/services/brand-branch.service'
import { BrandBranchStep } from '../types'

interface UseBranchCategoriesParams {
  canManageBranch: boolean
  selectedBranchId: string
  step: BrandBranchStep
}

export function useBranchCategories({
  canManageBranch,
  selectedBranchId,
  step,
}: UseBranchCategoriesParams) {
  const [categories, setCategories] = useState<BranchCategoryVisibilityItem[]>([])
  const [isCategoryLoading, setIsCategoryLoading] = useState(false)
  const [categoryActionLoading, setCategoryActionLoading] = useState<
    Record<string, boolean>
  >({})
  const [categorySearch, setCategorySearch] = useState('')

  const loadCategories = useCallback(async (branchId: string) => {
    setIsCategoryLoading(true)
    try {
      const rows = await brandBranchService.getBranchCategories(branchId, false)
      setCategories(rows)
    } catch {
      toast.error('Kategori görünürlük listesi alınamadı')
    } finally {
      setIsCategoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canManageBranch || !selectedBranchId || step !== 'overrides') return
    void loadCategories(selectedBranchId)
  }, [canManageBranch, selectedBranchId, step, loadCategories])

  const filteredCategories = useMemo(() => {
    const keyword = categorySearch.trim().toLowerCase()
    if (!keyword) return categories
    return categories.filter((item) => item.name.toLowerCase().includes(keyword))
  }, [categories, categorySearch])

  const handleToggleCategory = useCallback(
    async (category: BranchCategoryVisibilityItem) => {
      if (!selectedBranchId || !canManageBranch) return

      setCategoryActionLoading((prev) => ({
        ...prev,
        [category.categoryId]: true,
      }))
      try {
        if (category.isHiddenInBranch) {
          await brandBranchService.includeCategory(selectedBranchId, category.categoryId)
        } else {
          await brandBranchService.excludeCategory(selectedBranchId, category.categoryId)
        }
        await loadCategories(selectedBranchId)
        toast.success('Kategori görünürlüğü güncellendi')
      } catch {
        toast.error('Kategori görünürlüğü güncellenemedi')
      } finally {
        setCategoryActionLoading((prev) => ({
          ...prev,
          [category.categoryId]: false,
        }))
      }
    },
    [canManageBranch, loadCategories, selectedBranchId],
  )

  return {
    categories,
    filteredCategories,
    isCategoryLoading,
    categoryActionLoading,
    categorySearch,
    setCategorySearch,
    handleToggleCategory,
    loadCategories,
  }
}

