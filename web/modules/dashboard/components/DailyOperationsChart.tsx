'use client'

import React from 'react'
import { Info } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/modules/shared/components/Button'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { DailyOperations } from '../types'

interface DailyOperationsChartProps {
  data: DailyOperations | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

const METHOD_META: Record<string, { label: string; color: string }> = {
  cash: { label: 'Nakit', color: '#16a34a' },
  credit_card: { label: 'Kredi Kartı', color: '#2563eb' },
  debit_card: { label: 'Banka Kartı', color: '#0ea5e9' },
  digital_wallet: { label: 'Dijital Cüzdan', color: '#7c3aed' },
  bank_transfer: { label: 'Havale/EFT', color: '#f59e0b' },
  open_account: { label: 'Açık Hesap', color: '#ef4444' },
  meal_voucher: { label: 'Yemek Çeki', color: '#14b8a6' },
}

const DEFAULT_METHOD_ORDER = [
  'cash',
  'credit_card',
  'debit_card',
  'digital_wallet',
  'bank_transfer',
  'open_account',
  'meal_voucher',
]

function OperationsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; payload: any }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const bucket = payload[0]?.payload
  const total = payload.reduce((sum, item) => sum + Number(item.value || 0), 0)

  return (
    <div className="bg-bg-surface border border-border-light rounded-sm p-3 shadow-md min-w-[220px]">
      <p className="text-xs font-bold text-text-primary uppercase tracking-wider">{label}</p>
      <p className="text-sm font-black text-text-primary mt-1">{formatCurrency(total)}</p>
      <p className="text-[11px] text-text-muted mt-0.5">Paid sipariş: {bucket?.paidOrders || 0}</p>
      <div className="mt-2 space-y-1">
        {payload
          .filter((item) => Number(item.value || 0) > 0)
          .map((item) => {
            const key = item.dataKey
            const meta = METHOD_META[key] || { label: key, color: '#6b7280' }
            return (
              <div key={key} className="flex items-center justify-between gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  <span className="text-text-muted">{meta.label}</span>
                </div>
                <span className="font-bold text-text-primary tabular-nums">
                  {formatCurrency(Number(item.value || 0))}
                </span>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export function DailyOperationsChart({
  data,
  isLoading,
  error,
  onRetry,
}: DailyOperationsChartProps) {
  const chartData = (data?.series || []).map((bucket) => ({
    ...bucket,
    ...bucket.paymentBreakdown,
  }))

  const activeMethods = DEFAULT_METHOD_ORDER.filter(
    (method) =>
      Number(data?.paymentTotals?.[method] || 0) > 0 ||
      chartData.some((item) => Number((item as Record<string, unknown>)[method] || 0) > 0),
  )
  const nonZeroBuckets = chartData.filter((bucket) => Number(bucket.salesAmount || 0) > 0).length
  const hasSparseData = chartData.length > 0 && nonZeroBuckets <= 1

  return (
    <section className="bg-bg-surface border border-border-light rounded-sm shadow-sm overflow-hidden">
      <div className="p-4 pb-3 border-b border-border-light/60">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-primary-main rounded-full" />
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.15em]">
            GÜNLÜK OPERASYON
          </h2>
        </div>
        <p className="text-[11px] text-text-muted mt-1">30 dakikalık satış ve ödeme türü dağılımı</p>
      </div>

      {error && !isLoading ? (
        <div className="p-6 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-danger-main">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            TEKRAR DENE
          </Button>
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="border border-border-light rounded-sm p-3 bg-bg-app">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Açık Masa</p>
              <p className="text-xl font-black text-text-primary tabular-nums mt-1">
                {data?.currentOpenTables ?? 0}
              </p>
            </div>
            <div className="border border-border-light rounded-sm p-3 bg-bg-app">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Kapanmış (Paid)</p>
              <p className="text-xl font-black text-text-primary tabular-nums mt-1">
                {data?.closedPaidOrdersToday ?? 0}
              </p>
            </div>
            <div className="border border-border-light rounded-sm p-3 bg-bg-app">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Günlük Satış</p>
              <p className="text-xl font-black text-success-main tabular-nums mt-1">
                {formatCurrency(data?.dailySalesAmount || 0)}
              </p>
            </div>
            <div className="border border-border-light rounded-sm p-3 bg-bg-app">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Açık Sipariş Tutarı</p>
              <p className="text-xl font-black text-warning-main tabular-nums mt-1">
                {formatCurrency(data?.openOrdersAmount || 0)}
              </p>
            </div>
          </div>

          <div className="h-[280px]">
            {isLoading && chartData.length === 0 ? (
              <div className="h-full w-full bg-bg-muted animate-pulse rounded-sm" />
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-bold uppercase tracking-wider text-text-muted">
                GÜNLÜK OPERASYON VERİSİ BULUNAMADI
              </div>
            ) : (
              <div className="h-full">
                {hasSparseData ? (
                  <div className="mb-2 flex items-center gap-2 rounded-sm border border-border-light bg-bg-app px-3 py-2 text-[11px] font-semibold text-text-muted">
                    <Info size={14} className="text-info-main" />
                    Günün bu saatlerinde operasyon hareketi düşük. Grafik tek slotta veri içeriyor.
                  </div>
                ) : null}
                <div className={hasSparseData ? 'h-[calc(100%-36px)]' : 'h-full'}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 12, left: 4, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                      <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                        minTickGap={20}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}
                        tickFormatter={(value) => `₺${(Number(value) / 1000).toFixed(1)}k`}
                        width={56}
                      />
                      <Tooltip content={<OperationsTooltip />} />
                      <Legend
                        formatter={(value) => METHOD_META[value]?.label || value}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      {activeMethods.map((method) => (
                        <Bar
                          key={method}
                          dataKey={method}
                          stackId="sales"
                          fill={METHOD_META[method]?.color || '#6b7280'}
                          radius={[2, 2, 0, 0]}
                          maxBarSize={20}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
