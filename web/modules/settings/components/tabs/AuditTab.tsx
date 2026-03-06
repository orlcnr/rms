'use client'

import React, { useEffect } from 'react'
import { AuditLogDetailPanel } from '@/modules/reports/components/AuditLogDetailPanel'
import { AuditLogFilters } from '@/modules/reports/components/AuditLogFilters'
import { AuditLogsTable } from '@/modules/reports/components/AuditLogsTable'
import {
  createEmptyAuditLogsResponse,
  getDefaultAuditLogFilters,
} from '@/modules/reports/service'
import { useAuditReports } from '@/modules/reports/hooks/useAuditReports'

export function AuditTab() {
  const initialFilters = getDefaultAuditLogFilters()
  const {
    draftFilters,
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
  } = useAuditReports({
    initialData: createEmptyAuditLogsResponse(initialFilters.limit),
    initialFilters,
  })

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">
            Audit Loglar
          </h3>
          <p className="text-xs text-text-muted">
            Sistem hareketlerini filtreleyip detaylarını inceleyin.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={isExporting}
          className="rounded-sm border border-success-main px-3 py-2 text-[10px] font-black uppercase tracking-wider text-success-main disabled:opacity-60"
        >
          {isExporting ? 'CSV HAZIRLANIYOR' : 'CSV EXPORT'}
        </button>
      </div>

      <div className="rounded-sm border border-border-light bg-bg-surface p-4">
        <AuditLogFilters
          filters={draftFilters}
          onChange={setDraftFilters}
          onApply={applyFilters}
          onReset={resetFilters}
          isLoading={isLoading}
        />
      </div>

      <div className="grid min-h-[420px] xl:grid-cols-[minmax(0,1fr)_420px] rounded-sm border border-border-light bg-bg-surface overflow-hidden">
        <AuditLogsTable
          items={data.items}
          meta={data.meta}
          isLoading={isLoading}
          selectedLogId={selectedLog?.id}
          onSelect={setSelectedLog}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />

        <AuditLogDetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
      </div>
    </div>
  )
}

