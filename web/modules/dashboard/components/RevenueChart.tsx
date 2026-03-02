'use client'

import React from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/modules/shared/components/Button'
import { RevenueTrend } from '../types'

interface RevenueChartProps {
  data: RevenueTrend[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

function formatLabel(date: string) {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return date

  return value.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-surface border border-border-light rounded-sm p-3 shadow-md">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-base font-black text-text-primary tabular-nums">
          ₺{Number(payload[0].value || 0).toLocaleString('tr-TR')}
        </p>
      </div>
    )
  }
  return null
}

export function RevenueChart({ data, isLoading, error, onRetry }: RevenueChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    day: formatLabel(item.date),
  }))

  const avgRevenue = chartData.length
    ? chartData.reduce((sum, item) => sum + Number(item.amount || 0), 0) / chartData.length
    : 0

  return (
    <section className="bg-bg-surface border border-border-light rounded-sm shadow-sm overflow-hidden">
      <div className="p-4 pb-3 flex justify-between items-center border-b border-border-light/50">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-primary-main rounded-full" />
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.15em]">GELİR TRENDİ</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">HAFTALIK ORTALAMA</p>
            <p className="text-sm font-black text-text-primary tabular-nums">
              ₺{avgRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {error && !isLoading ? (
        <div className="p-6 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-danger-main">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>TEKRAR DENE</Button>
        </div>
      ) : (
        <div className="p-4 pt-3">
          <div className="h-[160px] w-full">
            {isLoading && chartData.length === 0 ? (
              <div className="h-full w-full bg-bg-muted animate-pulse rounded-sm" />
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-bold uppercase tracking-wider text-text-muted">
                GELİR VERİSİ BULUNAMADI
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(value) => `₺${(Number(value) / 1000).toFixed(1)}k`}
                    dx={-5}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--primary-main)"
                    strokeWidth={1.5}
                    dot={{ fill: 'var(--primary-main)', strokeWidth: 0, r: 3 }}
                    activeDot={{ fill: 'var(--primary-main)', strokeWidth: 0, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-border-light bg-bg-muted/30">
        <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">SON 7 GÜN</p>
      </div>
    </section>
  )
}
