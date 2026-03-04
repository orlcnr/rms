'use client'

import React from 'react'
import {
  getDefaultReportDateRange,
} from '../service'
import { ReportDateRangeFilters } from '../types'

interface UseReportDateRangeFiltersOptions {
  initialFilters?: ReportDateRangeFilters
  defaultDays?: number
}

export function useReportDateRangeFilters({
  initialFilters,
  defaultDays = 30,
}: UseReportDateRangeFiltersOptions = {}) {
  const baseFilters = React.useMemo(
    () => initialFilters || getDefaultReportDateRange(defaultDays),
    [defaultDays, initialFilters],
  )

  const [draftFilters, setDraftFilters] =
    React.useState<ReportDateRangeFilters>(baseFilters)
  const [appliedFilters, setAppliedFilters] =
    React.useState<ReportDateRangeFilters>(baseFilters)

  const applyFilters = React.useCallback(() => {
    setAppliedFilters(draftFilters)
    return draftFilters
  }, [draftFilters])

  const resetFilters = React.useCallback(() => {
    const nextFilters = getDefaultReportDateRange(defaultDays)

    setDraftFilters(nextFilters)
    setAppliedFilters(nextFilters)
    return nextFilters
  }, [defaultDays])

  return {
    draftFilters,
    appliedFilters,
    setDraftFilters,
    applyFilters,
    resetFilters,
  }
}
