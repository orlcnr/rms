'use client'

import React from 'react'
import { toast } from 'sonner'
import {
  createEmptyAuditLogsResponse,
  getDefaultAuditLogFilters,
  reportsService,
} from '../service'
import {
  AuditLogFilters,
  AuditLogItem,
  PaginatedAuditLogs,
} from '../types'

interface UseAuditReportsOptions {
  initialData: PaginatedAuditLogs
  initialFilters: AuditLogFilters
}

export function useAuditReports({
  initialData,
  initialFilters,
}: UseAuditReportsOptions) {
  const [draftFilters, setDraftFilters] = React.useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = React.useState(initialFilters)
  const [data, setData] = React.useState(
    initialData || createEmptyAuditLogsResponse(initialFilters.limit),
  )
  const [selectedLog, setSelectedLog] = React.useState<AuditLogItem | null>(
    initialData.items[0] || null,
  )
  const [isLoading, setIsLoading] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)

  const fetchAuditLogs = React.useCallback(async (filters: AuditLogFilters) => {
    setIsLoading(true)

    try {
      const response = await reportsService.getAuditLogs(filters)
      setData(response)
      setSelectedLog((currentSelectedLog) => {
        if (!response.items.length) {
          return null
        }

        return (
          response.items.find((item) => item.id === currentSelectedLog?.id) ||
          response.items[0]
        )
      })
    } catch (error) {
      console.error('[Reports] Audit log fetch failed:', error)
      toast.error('Audit loglar alınırken bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const applyFilters = React.useCallback(async () => {
    const nextFilters = {
      ...draftFilters,
      page: 1,
    }

    setDraftFilters(nextFilters)
    setAppliedFilters(nextFilters)
    await fetchAuditLogs(nextFilters)
  }, [draftFilters, fetchAuditLogs])

  const resetFilters = React.useCallback(async () => {
    const nextFilters = getDefaultAuditLogFilters()

    setDraftFilters(nextFilters)
    setAppliedFilters(nextFilters)
    await fetchAuditLogs(nextFilters)
  }, [fetchAuditLogs])

  const changePage = React.useCallback(
    async (page: number) => {
      const nextFilters = {
        ...appliedFilters,
        page,
      }

      setAppliedFilters(nextFilters)
      setDraftFilters((currentDraftFilters) => ({
        ...currentDraftFilters,
        page,
      }))
      await fetchAuditLogs(nextFilters)
    },
    [appliedFilters, fetchAuditLogs],
  )

  const changePageSize = React.useCallback(
    async (limit: number) => {
      const nextFilters = {
        ...appliedFilters,
        page: 1,
        limit,
      }

      setAppliedFilters(nextFilters)
      setDraftFilters((currentDraftFilters) => ({
        ...currentDraftFilters,
        page: 1,
        limit,
      }))
      await fetchAuditLogs(nextFilters)
    },
    [appliedFilters, fetchAuditLogs],
  )

  const exportCsv = React.useCallback(async () => {
    setIsExporting(true)

    try {
      const blob = await reportsService.exportAuditLogsCsv(appliedFilters)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = 'audit-logs.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[Reports] CSV export failed:', error)
      toast.error('CSV export sırasında bir hata oluştu.')
    } finally {
      setIsExporting(false)
    }
  }, [appliedFilters])

  const refresh = React.useCallback(async () => {
    await fetchAuditLogs(appliedFilters)
  }, [appliedFilters, fetchAuditLogs])

  return {
    draftFilters,
    appliedFilters,
    data,
    selectedLog,
    isLoading,
    isExporting,
    setDraftFilters,
    setSelectedLog,
    applyFilters,
    resetFilters,
    changePage,
    changePageSize,
    exportCsv,
    refresh,
  }
}
