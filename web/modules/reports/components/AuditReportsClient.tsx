'use client'

import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { BodySection, FilterSection, SubHeaderSection } from '@/modules/shared/components/layout'
import { AuditLogDetailPanel } from './AuditLogDetailPanel'
import { AuditLogFilters } from './AuditLogFilters'
import { AuditLogsTable } from './AuditLogsTable'
import { ReportKpiStrip } from './ReportKpiStrip'
import { useAuditReports } from '../hooks/useAuditReports'
import { AuditLogFilters as AuditLogFiltersValue, PaginatedAuditLogs } from '../types'

interface AuditReportsClientProps {
  initialData: PaginatedAuditLogs
  initialFilters: AuditLogFiltersValue
}

export function AuditReportsClient({
  initialData,
  initialFilters,
}: AuditReportsClientProps) {
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
    initialData,
    initialFilters,
  })

  const kpiItems = [
    {
      label: 'Tarih Aralığı',
      value: `${draftFilters.startDate} / ${draftFilters.endDate}`,
      accentClassName: 'text-warning-main',
    },
    {
      label: 'Toplam Kayıt',
      value: String(data.meta.totalItems),
    },
    {
      label: 'Aktif Sayfa',
      value: String(data.meta.currentPage),
    },
    {
      label: 'Bağlantı',
      value: 'AUDIT AKIŞI İZLENİYOR',
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-app">
      <SubHeaderSection
        title="AUDIT LOG RAPORLARI"
        description="Sistem hareketlerini filtreleyin, detaylarini inceleyin ve CSV olarak disa aktarın."
        moduleColor="bg-slate-500"
        isConnected
        isSyncing={isLoading || isExporting}
        onRefresh={() => void refresh()}
        actions={
          <>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 rounded-sm border border-border-light px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-primary transition hover:bg-bg-surface"
            >
              <ArrowLeft size={14} />
              Rapor Merkezi
            </Link>
            <button
              type="button"
              onClick={exportCsv}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-sm border border-success-main px-4 py-3 text-[11px] font-black uppercase tracking-wider text-success-main transition hover:bg-success-bg disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={14} />
              {isExporting ? 'CSV Hazırlanıyor' : 'CSV Export'}
            </button>
          </>
        }
      />

      <main className="flex flex-col flex-1 pb-6 min-h-0">
        <FilterSection>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex-1 min-w-0">
              <AuditLogFilters
                filters={draftFilters}
                onChange={setDraftFilters}
                onApply={applyFilters}
                onReset={resetFilters}
                isLoading={isLoading}
              />
            </div>

            <ReportKpiStrip items={kpiItems} />
          </div>
        </FilterSection>

        <BodySection noPadding className="overflow-hidden">
          <div className="grid h-full min-h-0 xl:grid-cols-[minmax(0,1fr)_420px]">
            <AuditLogsTable
              items={data.items}
              meta={data.meta}
              isLoading={isLoading}
              selectedLogId={selectedLog?.id}
              onSelect={setSelectedLog}
              onPageChange={changePage}
              onPageSizeChange={changePageSize}
            />

            <AuditLogDetailPanel
              log={selectedLog}
              onClose={() => setSelectedLog(null)}
            />
          </div>
        </BodySection>
      </main>
    </div>
  )
}
