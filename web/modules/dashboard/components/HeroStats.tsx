'use client'

import React from 'react'
import { Armchair, Package, Receipt, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'
import { Button } from '@/modules/shared/components/Button'
import { DashboardKpi } from '../types'

interface HeroStatsProps {
  data: DashboardKpi | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

export function HeroStats({ data, isLoading, error, onRetry }: HeroStatsProps) {
  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-bg-surface border border-border-light rounded-sm p-4 animate-pulse h-[152px]"
          />
        ))}
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="bg-bg-surface border border-border-light rounded-sm p-6 flex items-center justify-between">
        <p className="text-sm font-bold text-danger-main uppercase tracking-wider">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>TEKRAR DENE</Button>
      </div>
    )
  }

  const pendingOrders = Number(data?.activeOrdersPending || 0)
  const activeOrders = Number(data?.activeOrders || 0)
  const pendingRatio = activeOrders > 0 ? Math.min(100, Math.round((pendingOrders / activeOrders) * 100)) : 0
  const dailySalesChange = Number(data?.dailySalesChange || 0)

  const pendingLevel = pendingOrders >= 10
    ? {
      badge: 'KRİTİK',
      badgeClass: 'bg-danger-bg text-danger-main',
      barClass: 'bg-danger-main',
    }
    : pendingOrders >= 6
      ? {
        badge: 'YÜKSEK',
        badgeClass: 'bg-orange-100 text-orange-700',
        barClass: 'bg-orange-500',
      }
      : pendingOrders >= 3
        ? {
          badge: 'DİKKAT',
          badgeClass: 'bg-warning-bg text-warning-main',
          barClass: 'bg-warning-main',
        }
        : {
          badge: 'NORMAL',
          badgeClass: 'bg-success-bg text-success-main',
          barClass: 'bg-success-main',
        }

  const kpis = [
    {
      label: 'GÜNLÜK NET SATIŞ',
      value: `₺${Number(data?.dailyNetSales || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`,
      trend: `${dailySalesChange >= 0 ? '+' : ''}${dailySalesChange.toFixed(1)}%`,
      trendClass: dailySalesChange >= 0 ? 'bg-success-bg text-success-main' : 'bg-danger-bg text-danger-main',
      icon: Receipt,
      color: 'text-success-main',
    },
    {
      label: 'AKTİF SİPARİŞLER',
      value: String(activeOrders),
      trend: `${pendingOrders} Bekleyen / ${activeOrders} Aktif`,
      trendClass: pendingLevel.badgeClass,
      extra: pendingLevel,
      icon: UtensilsCrossed,
      color: 'text-primary-main',
    },
    {
      label: 'MASA DOLULUK ORANI',
      value: `%${Number(data?.tableOccupancyRate || 0).toFixed(0)}`,
      trend: `${data?.occupiedTables || 0}/${data?.totalTables || 0} Dolu`,
      trendClass: 'bg-info-bg text-info-main',
      icon: Armchair,
      color: 'text-info-main',
    },
    {
      label: 'KRİTİK STOK UYARISI',
      value: String(data?.criticalStockCount || 0),
      trend: 'İzlenmeli',
      trendClass: 'bg-bg-muted text-text-secondary',
      icon: Package,
      color: 'text-warning-main',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className="bg-bg-surface border border-border-light rounded-sm p-4 hover:border-border-medium transition-all shadow-sm"
        >
          <div className="flex justify-between items-start mb-3">
            <div
              className={cn(
                'w-10 h-10 rounded-sm flex items-center justify-center',
                'bg-bg-muted border border-border-light',
                kpi.color,
              )}
            >
              <kpi.icon size={20} strokeWidth={1.5} />
            </div>
            <div
              className={cn(
                'text-xs font-semibold px-2 py-1 rounded-sm tracking-wider tabular-nums',
                kpi.trendClass,
              )}
            >
              {kpi.extra?.badge || kpi.trend}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-[0.1em] mb-1.5">{kpi.label}</p>
            <h3 className="text-2xl font-black text-text-primary tracking-tight tabular-nums leading-none">
              {kpi.value}
            </h3>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mt-2">
              {kpi.trend}
            </p>
            {kpi.label === 'AKTİF SİPARİŞLER' ? (
              <div className="mt-2">
                <div className="w-full h-1.5 rounded-full bg-bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', pendingLevel.barClass)}
                    style={{ width: `${pendingRatio}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
