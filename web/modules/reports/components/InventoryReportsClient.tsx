'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { BodySection, FilterSection, SubHeaderSection } from '@/modules/shared/components/layout'
import { ReportDataCard } from './ReportDataCard'
import { ReportDateRangeFilter } from './ReportDateRangeFilter'
import { ReportEmptyState } from './ReportEmptyState'
import { ReportKpiStrip } from './ReportKpiStrip'
import { reportsService } from '../service'
import { useReportDateRangeFilters } from '../hooks/useReportDateRangeFilters'
import { InventoryReportBundle, ReportDateRangeFilters } from '../types'
import { formatNumber } from '../utils'

interface InventoryReportsClientProps {
  initialData: InventoryReportBundle
  initialFilters: ReportDateRangeFilters
}

export function InventoryReportsClient({
  initialData,
  initialFilters,
}: InventoryReportsClientProps) {
  const {
    draftFilters,
    appliedFilters,
    setDraftFilters,
    applyFilters,
    resetFilters,
  } = useReportDateRangeFilters({ initialFilters, defaultDays: 7 })
  const [data, setData] = React.useState(initialData)
  const [isLoading, setIsLoading] = React.useState(false)

  const loadReports = React.useCallback(async (filters: ReportDateRangeFilters) => {
    setIsLoading(true)

    try {
      const [stockStatus, stockMovements, wastage] = await Promise.all([
        reportsService.getInventoryStatus(),
        reportsService.getInventoryMovements(filters),
        reportsService.getInventoryWastage(filters),
      ])

      setData({ stockStatus, stockMovements, wastage })
    } catch (error) {
      console.error('[Reports] Inventory reports fetch failed:', error)
      toast.error('Stok raporları alınırken bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const criticalItems = data.stockStatus.filter((item) => item.is_critical)

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-app">
      <SubHeaderSection
        title="STOK RAPORLARI"
        description="Mevcut stok seviyelerini, düşük stok riskini ve hareket geçmişini izleyin."
        moduleColor="bg-amber-600"
        isConnected
        isSyncing={isLoading}
        onRefresh={() => void loadReports(appliedFilters)}
        actions={
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 rounded-sm border border-border-light px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-primary transition hover:bg-bg-surface"
          >
            <ArrowLeft size={14} />
            Rapor Merkezi
          </Link>
        }
      />

      <main className="flex flex-1 flex-col pb-6 min-h-0">
        <FilterSection>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex-1 min-w-0">
              <ReportDateRangeFilter
                filters={draftFilters}
                onChange={setDraftFilters}
                onApply={() => void loadReports(applyFilters())}
                onReset={() => void loadReports(resetFilters())}
                isLoading={isLoading}
              />
            </div>

            <ReportKpiStrip
              items={[
                { label: 'Takip Edilen Ürün', value: formatNumber(data.stockStatus.length) },
                { label: 'Kritik Stok', value: formatNumber(criticalItems.length) },
                { label: 'Hareket', value: formatNumber(data.stockMovements.length) },
                { label: 'Fire Kaydı', value: formatNumber(data.wastage.length) },
              ]}
            />
          </div>
        </FilterSection>

        <BodySection className="overflow-auto bg-transparent p-0 shadow-none">
          <div className="grid gap-4 xl:grid-cols-2">
            <ReportDataCard title="Stok Durumu">
              {data.stockStatus.length ? (
                <div className="space-y-3">
                  {data.stockStatus.map((item) => (
                    <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-3 border-b border-border-light pb-3 last:border-b-0 last:pb-0">
                      <span className="truncate text-sm font-bold text-text-primary">{item.name}</span>
                      <span className="text-right text-sm font-bold text-text-secondary">{formatNumber(item.current_quantity)} {item.unit}</span>
                      <span className={`text-right text-sm font-black ${item.is_critical ? 'text-danger-main' : 'text-text-primary'}`}>
                        {formatNumber(item.critical_level)} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState title="Veri Yok" description="Stok durumu listesi bulunamadı." />
              )}
            </ReportDataCard>

            <ReportDataCard title="Düşük Stok Uyarıları">
              {criticalItems.length ? (
                <div className="space-y-3">
                  {criticalItems.map((item) => (
                    <div key={item.id} className="rounded-sm border border-danger-main/30 bg-danger-bg px-4 py-3">
                      <p className="text-sm font-black text-danger-main">{item.name}</p>
                      <p className="mt-1 text-sm font-bold text-text-secondary">
                        {formatNumber(item.current_quantity)} {item.unit} mevcut, kritik eşik {formatNumber(item.critical_level)} {item.unit}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState title="Risk Yok" description="Kritik stok seviyesinde ürün bulunmuyor." />
              )}
            </ReportDataCard>

            <ReportDataCard title="Stok Hareket Geçmişi">
              {data.stockMovements.length ? (
                <div className="space-y-3">
                  {data.stockMovements.map((item, index) => (
                    <div key={`${item.ingredient_name}-${item.type}-${index}`} className="grid grid-cols-[minmax(0,1fr)_90px_110px] gap-3 border-b border-border-light pb-3 last:border-b-0 last:pb-0">
                      <span className="truncate text-sm font-bold text-text-primary">{item.ingredient_name}</span>
                      <span className="text-right text-sm font-bold text-text-secondary">{item.type}</span>
                      <span className="text-right text-sm font-black text-text-primary">{formatNumber(item.total_quantity)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState title="Veri Yok" description="Seçilen tarih aralığında hareket kaydı bulunamadı." />
              )}
            </ReportDataCard>

            <ReportDataCard title="Fire Özeti">
              {data.wastage.length ? (
                <div className="space-y-3">
                  {data.wastage.map((item, index) => (
                    <div key={`${item.ingredient_name}-${index}`} className="grid grid-cols-[minmax(0,1fr)_110px_90px] gap-3 border-b border-border-light pb-3 last:border-b-0 last:pb-0">
                      <span className="truncate text-sm font-bold text-text-primary">{item.ingredient_name}</span>
                      <span className="text-right text-sm font-bold text-text-secondary">{formatNumber(item.total_wastage)} {item.unit}</span>
                      <span className="text-right text-sm font-black text-text-primary">{formatNumber(item.incident_count)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState title="Veri Yok" description="Fire kaydı bulunmuyor." />
              )}
            </ReportDataCard>
          </div>
        </BodySection>
      </main>
    </div>
  )
}
