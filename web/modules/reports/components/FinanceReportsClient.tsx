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
import { FinanceReportBundle, ReportDateRangeFilters } from '../types'
import { formatCurrency, formatNumber } from '../utils'

interface FinanceReportsClientProps {
  initialData: FinanceReportBundle
  initialFilters: ReportDateRangeFilters
}

export function FinanceReportsClient({
  initialData,
  initialFilters,
}: FinanceReportsClientProps) {
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
      const [dailySales, paymentStats, discountStats] = await Promise.all([
        reportsService.getSalesDaily(filters),
        reportsService.getFinancePayments(filters),
        reportsService.getFinanceDiscounts(filters),
      ])

      setData({ dailySales, paymentStats, discountStats })
    } catch (error) {
      console.error('[Reports] Finance reports fetch failed:', error)
      toast.error('Finans raporları alınırken bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const totalRevenue = data.dailySales.reduce(
    (sum, item) => sum + item.total_revenue,
    0,
  )
  const totalTransactions = data.paymentStats.reduce(
    (sum, item) => sum + item.count,
    0,
  )
  const dominantMethod = data.paymentStats.reduce(
    (top, item) => (item.total_amount > top.total_amount ? item : top),
    data.paymentStats[0] || { method: '-', count: 0, total_amount: 0 },
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-app">
      <SubHeaderSection
        title="KASA & FİNANS RAPORLARI"
        description="Ödeme yöntemi dağılımını, indirim etkisini ve satış bazlı gelir eğilimini takip edin."
        moduleColor="bg-blue-600"
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
                { label: 'Satış Geliri', value: formatCurrency(totalRevenue) },
                { label: 'İşlem Sayısı', value: formatNumber(totalTransactions) },
                { label: 'Toplam İndirim', value: formatCurrency(data.discountStats.total_discount) },
                { label: 'Baskın Yöntem', value: dominantMethod.method || '-' },
              ]}
            />
          </div>
        </FilterSection>

        <BodySection className="overflow-auto bg-transparent p-0 shadow-none">
          <div className="grid gap-4 xl:grid-cols-2">
            <ReportDataCard
              title="Satış Bazlı Gelir Notu"
              description="Bu görünüm tahsil edilen kasadaki nakdi değil, ödenmiş satış gelirini gösterir."
            >
              <p className="text-sm font-bold text-text-secondary">
                Kasa mutabakatı için ödeme yöntemi kırılımı ile birlikte değerlendirilmelidir.
              </p>
            </ReportDataCard>

            <ReportDataCard title="Ödeme Yöntemi Kırılımı">
              {data.paymentStats.length ? (
                <div className="space-y-3">
                  {data.paymentStats.map((item) => (
                    <div key={item.method} className="grid grid-cols-[minmax(0,1fr)_90px_140px] gap-3 border-b border-border-light pb-3 last:border-b-0 last:pb-0">
                      <span className="truncate text-sm font-bold text-text-primary">{item.method}</span>
                      <span className="text-right text-sm font-bold text-text-secondary">{formatNumber(item.count)}</span>
                      <span className="text-right text-sm font-black text-text-primary">{formatCurrency(item.total_amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState title="Veri Yok" description="Ödeme yöntemi istatistiği bulunamadı." />
              )}
            </ReportDataCard>

            <ReportDataCard title="Günlük Gelir Özeti" description="Ödenmiş satışlar üzerinden günlük gelir hareketi.">
              {data.dailySales.length ? (
                <div className="space-y-3">
                  {data.dailySales.map((item) => (
                    <div key={item.date} className="grid grid-cols-[120px_120px_140px] gap-3 border-b border-border-light pb-3 last:border-b-0 last:pb-0">
                      <span className="text-sm font-bold text-text-primary">{item.date.slice(0, 10)}</span>
                      <span className="text-right text-sm font-bold text-text-secondary">{formatNumber(item.order_count)}</span>
                      <span className="text-right text-sm font-black text-text-primary">{formatCurrency(item.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState title="Veri Yok" description="Seçilen tarih aralığında gelir kaydı bulunamadı." />
              )}
            </ReportDataCard>

            <ReportDataCard title="İndirim Etkisi">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-sm border border-border-light bg-bg-surface p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Toplam İndirim</p>
                  <p className="mt-2 text-xl font-black text-text-primary">
                    {formatCurrency(data.discountStats.total_discount)}
                  </p>
                </div>
                <div className="rounded-sm border border-border-light bg-bg-surface p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">İndirimli İşlem</p>
                  <p className="mt-2 text-xl font-black text-text-primary">
                    {formatNumber(data.discountStats.discounted_orders_count)}
                  </p>
                </div>
              </div>
            </ReportDataCard>
          </div>
        </BodySection>
      </main>
    </div>
  )
}
