'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BranchItemVisibility } from '@/modules/settings/services/brand-branch.service'
import { BranchQueryState, DEFAULT_LIMIT } from '../types'

export function useBranchQueryState(currentRestaurantId: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchDraft, setSearchDraft] = useState(searchParams.get('search') || '')

  const queryState: BranchQueryState = {
    step: (searchParams.get('step') as BranchQueryState['step']) || 'branches',
    selectedBranchId: searchParams.get('branchId') || currentRestaurantId || '',
    page: Math.max(1, Number(searchParams.get('page') || '1')),
    limit: Math.min(
      100,
      Math.max(1, Number(searchParams.get('limit') || DEFAULT_LIMIT)),
    ),
    search: searchParams.get('search') || '',
    categoryId: searchParams.get('categoryId') || '',
    visibility: (searchParams.get('visibility') as BranchItemVisibility) || 'all',
    overrideOnly: searchParams.get('overrideOnly') === 'true',
    managementTab:
      searchParams.get('managementTab') === 'categories' ? 'categories' : 'products',
  }

  const setQuery = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      params.set('tab', 'brand-branch')
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    setSearchDraft(queryState.search)
  }, [queryState.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchDraft !== queryState.search) {
        setQuery({ search: searchDraft || null, page: '1' })
      }
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [queryState.search, searchDraft, setQuery])

  return {
    queryState,
    setQuery,
    searchDraft,
    setSearchDraft,
  }
}
