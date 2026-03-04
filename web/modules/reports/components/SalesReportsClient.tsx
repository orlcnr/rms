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
import { ReportDateRangeFilters, SalesReportBundle } from '../types'
import { formatCurrency, formatNumber } from '../utils'

interface SalesReportsClientProps {
  initialData: SalesReportBundle
  initialFilters: ReportDateRangeFilters
}

export function SalesReportsClient({
  initialData,
  initialFilters,
}: SalesReportsClientProps) {
  const {
    draftFilters,
    appliedFilters,
    setDraftFilters,
    applyFilters,
    resetFilters,
  } = useReportDateRangeFilters({ initialFilters, defaultDays: 30 })
  const [data, setData] = React.useState(initialData)
  const [isLoading, setIsLoading] = React.useState(false)

  const loadReports = React.useCallback(async (filters: ReportDateRangeFilters) => {
    setIsLoading(true)

    try {
      const [dailySales, productSales, categorySales, hourlySales] =
        await Promise.all([
          reportsService.getSalesDaily(filters),
          reportsService.getSalesByProduct(filters),
          reportsService.getSalesByCategory(filters),
          reportsService.getSalesHourly(filters.endDate),
        ])

      setData({ dailySales, productSales, categorySales, hourlySales })
    } catch (error) {
      console.error('[Reports] Sales reports fetch failed:', error)
      toast.error('Satış raporları alınırken bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const totalRevenue = data.dailySales.reduce(
    (sum, item) => sum + item.total_revenue,
    0,
  )
  const totalOrders = data.dailySales.reduce(
    (sum, item) => sum + item.order_count,
    0,
  )
  const averageBasket = totalOrders ? totalRevenue / totalOrders : 0
  const peakHour =
    data.hourlySales.reduce(
      (peak, item) => (item.order_count > peak.order_count ? item : peak),
      data.hourlySales[0] || { hour: 0, order_count: 0, total_revenue: 0 },
    ).hour
  const maxHourlyRevenue = Math.max(
    ...data.hourlySales.map((item) => item.total_revenue),
    0,
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-app">
      <SubHeaderSection
        title="SATIŞ RAPORLARI"
        description="Günlük satış eğilimlerini, ürün performansını ve saatlik yoğunluğu izleyin."
        moduleColor="bg-emerald-600"
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
                { label: 'Toplam Ciro', value: formatCurrency(totalRevenue) },
                { label: 'Sipariş', value: formatNumber(totalOrders) },
                { label: 'Ort. Sepet', value: formatCurrency(averageBasket) },
                { label: 'Yoğun Saat', value: `${String(peakHour).padStart(2, '0')}:00` },
              ]}
            />
          </div>
        </FilterSection>

        <BodySection className="overflow-auto bg-transparent p-0 shadow-none">
          <div className="grid gap-4 xl:grid-cols-2">
            <ReportDataCard title="Günlük Satış Özeti">
              {data.dailySales.length ? (
                <div className="space-y-3">
                  {data.dailySales.map((item) => (
                    <div key={item.date} className="flex items-center justify-between border-b border-border-light pb-3 last:border-b-0 last:pb-0">
                      <span className="text-sm font-bold text-text-primary">
                        {item.date.slice(0, 10)}
                      </span>
                      <span className="text-sm font-black text-text-primary">
                        {formatCurrency(item.total_revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState title="Veri Yok" description="Seçilen tarih aralığında satış bulunamadı." />
              )}
            </ReportDataCard>

            <ReportDataCard title="Ürün Bazlı Satış" description="En yüksek ciro üreten ilk 10 ürün.">
              {data.productSales.length ? (
                <div className="space-y-3">
                  {data.productSales.map((item) => (
                    <div key={item.product_id} className="grid grid-cols-[minmax(0,1fr)_90px_120px] gap-3 border-b border-border-light pb-3 last:border-b-0 last:pb-0">
                      <span className="truncate text-sm font-bold text-text-primary">{item.product_name}</span>
                      <span className="text-right text-sm font-bold text-text-secondary">{formatNumber(item.total_quantity)}</span>
                      <span className="text-right text-sm font-black text-text-primary">{formatCurrency(item.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState title="Veri Yok" description="Ürün bazlı satış kaydı bulunamadı." />
              )}
            </ReportDataCard>

            <ReportDataCard title="Kategori Kırılımı">
              {data.categorySales.length ? (
                <div className="space-y-3">
                  {data.categorySales.map((item) => (
                    <div key={item.category_id || item.category_name} className="grid grid-cols-[minmax(0,1fr)_120px] gap-3 border-b border-border-light pb-3 last:border-b-0 last:pb-0">
                      <span className="truncate text-sm font-bold text-text-primary">{item.category_name || 'Tanımsız'}</span>
                      <span className="text-right text-sm font-black text-text-primary">{formatCurrency(item.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState title="Veri Yok" description="Kategori kırılımı üretilemedi." />
              )}
            </ReportDataCard>

            <ReportDataCard title="Saatlik Yoğunluk" description="Günün saatlerine göre ciro yoğunluğu.">
              {data.hourlySales.length ? (
                <div className="space-y-3">
                  {data.hourlySales.map((item) => (
                    <div key={item.hour} className="grid grid-cols-[56px_minmax(0,1fr)_88px] items-center gap-3">
                      <span className="text-sm font-bold text-text-primary">{String(item.hour).padStart(2, '0')}:00</span>
                      <div className="h-2 overflow-hidden rounded-full bg-bg-app">
                        <div
                          className="h-full rounded-full bg-primary-main"
                          style={{
                            width: `${maxHourlyRevenue ? (item.total_revenue / maxHourlyRevenue) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-right text-sm font-black text-text-primary">{formatCurrency(item.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState title="Veri Yok" description="Seçilen gün için saatlik yoğunluk bulunamadı." />
              )}
            </ReportDataCard>
          </div>
        </BodySection>
      </main>
    </div>
  )
}
