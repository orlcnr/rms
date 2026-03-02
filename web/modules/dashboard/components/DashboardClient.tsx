'use client'

import React, { useEffect } from 'react'
import { HeroStats } from './HeroStats'
import { RecentOrders } from './RecentOrders'
import { UpcomingReservations } from './UpcomingReservations'
import { DashboardNavigation } from './DashboardNavigation'
import { RevenueChart } from './RevenueChart'
import { DashboardFooter } from './DashboardFooter'
import { useDashboardStore } from '../stores/dashboard.store'
import { Button } from '@/modules/shared/components/Button'
import { useDashboardSocket } from '../hooks/useDashboardSocket'
import { ConnectionStatus } from './ConnectionStatus'
import { DailyOperationsChart } from './DailyOperationsChart'

interface DashboardClientProps {
  restaurantId: string
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-[152px] bg-bg-surface border border-border-light rounded-sm animate-pulse" />
        ))}
      </div>
      <div className="h-40 bg-bg-surface border border-border-light rounded-sm animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 h-80 bg-bg-surface border border-border-light rounded-sm animate-pulse" />
        <div className="lg:col-span-4 h-80 bg-bg-surface border border-border-light rounded-sm animate-pulse" />
      </div>
      <div className="h-64 bg-bg-surface border border-border-light rounded-sm animate-pulse" />
    </div>
  )
}

export default function DashboardClient({ restaurantId }: DashboardClientProps) {
  const {
    kpi,
    recentOrders,
    reservations,
    revenueTrend,
    dailyOperations,
    isSocketConnected,
    isLoading,
    panelLoading,
    panelError,
    loadAll,
    reloadPanel,
  } = useDashboardStore()
  useDashboardSocket({ restaurantId })

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const hasAnyData =
    Boolean(kpi) ||
    recentOrders.length > 0 ||
    reservations.length > 0 ||
    revenueTrend.length > 0
    || Boolean(dailyOperations)

  return (
    <div className="min-h-screen bg-bg-app erp-container">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary uppercase tracking-[0.14em]">KONTROL PANELİ</h1>
          <div className="mt-1.5">
            <ConnectionStatus isConnected={isSocketConnected} />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadAll()} isLoading={isLoading}>
          YENİLE
        </Button>
      </div>

      {!hasAnyData && isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-5">
          <HeroStats
            data={kpi}
            isLoading={panelLoading.kpi}
            error={panelError.kpi}
            onRetry={() => void reloadPanel('kpi')}
          />

          <div className="pt-2 pb-2">
            <div className="mb-3">
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.12em]">YÖNETİM KISAYOLLARI</h2>
            </div>
            <DashboardNavigation />
          </div>

          <DailyOperationsChart
            data={dailyOperations}
            isLoading={panelLoading.operations}
            error={panelError.operations}
            onRetry={() => void reloadPanel('operations')}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-8">
              <RecentOrders
                orders={recentOrders}
                isLoading={panelLoading.orders}
                error={panelError.orders}
                onRetry={() => void reloadPanel('orders')}
              />
            </div>

            <div className="lg:col-span-4 h-full">
              <UpcomingReservations
                reservations={reservations}
                isLoading={panelLoading.reservations}
                error={panelError.reservations}
                onRetry={() => void reloadPanel('reservations')}
              />
            </div>
          </div>

          <RevenueChart
            data={revenueTrend}
            isLoading={panelLoading.revenue}
            error={panelError.revenue}
            onRetry={() => void reloadPanel('revenue')}
          />

          <DashboardFooter />
        </div>
      )}
    </div>
  )
}
