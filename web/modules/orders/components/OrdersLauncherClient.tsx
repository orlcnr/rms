'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { UtensilsCrossed, Zap, Bike } from 'lucide-react'
import { SubHeaderSection, BodySection } from '@/modules/shared/components/layout'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { useSocketStore } from '@/modules/shared/api/socket'
import { cn } from '@/modules/shared/utils/cn'

interface OrdersLauncherClientProps {
  restaurantId: string
  summaryDateLabel: string
  tableActiveCount: number
  deliveryActiveCount: number
  todayOrderCount: number
  todayRevenue: number
}

export function OrdersLauncherClient({
  restaurantId,
  summaryDateLabel,
  tableActiveCount,
  deliveryActiveCount,
  todayOrderCount,
  todayRevenue,
}: OrdersLauncherClientProps) {
  const { isConnected, connect } = useSocketStore()

  useEffect(() => {
    connect(restaurantId)
  }, [connect, restaurantId])

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <SubHeaderSection
        title="SİPARİŞ YÖNETİMİ"
        description="Masalar, tezgah ve paket siparişleri tek noktadan yönetin"
        moduleColor="bg-success-main"
      />

      <main className="flex flex-1 min-h-0 flex-col pb-6">
        <BodySection className="gap-6">
          <div className="rounded-sm border border-border-light bg-bg-muted px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-black uppercase tracking-widest text-primary-main">
                {summaryDateLabel}
              </p>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    isConnected ? 'bg-success-main animate-pulse' : 'bg-danger-main',
                  )}
                />
                {isConnected ? 'Socket Aktif' : 'Socket Pasif'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link
              href="/orders/board"
              className="group rounded-sm border border-border-light bg-bg-surface p-5 transition-all hover:border-primary-main/50 hover:bg-primary-main/5 active:scale-[0.98]"
            >
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-sm bg-primary-main/12 text-primary-main">
                <UtensilsCrossed size={24} />
              </div>
              <p className="text-lg font-black uppercase tracking-[0.18em] text-text-primary">
                Masalar
              </p>
              <p className="mt-2 text-sm font-bold text-text-secondary">
                {tableActiveCount} aktif sipariş
              </p>
            </Link>

            <Link
              href="/orders/counter"
              className="group rounded-sm border border-border-light bg-bg-surface p-5 transition-all hover:border-primary-main/50 hover:bg-primary-main/5 active:scale-[0.98]"
            >
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-sm bg-warning-main/15 text-warning-main">
                <Zap size={24} />
              </div>
              <p className="text-lg font-black uppercase tracking-[0.18em] text-text-primary">
                Tezgah
              </p>
              <p className="mt-2 text-sm font-bold text-text-secondary">
                Hızlı sipariş
              </p>
            </Link>

            <Link
              href="/orders/delivery"
              className="group rounded-sm border border-border-light bg-bg-surface p-5 transition-all hover:border-primary-main/50 hover:bg-primary-main/5 active:scale-[0.98]"
            >
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-sm bg-success-main/15 text-success-main">
                <Bike size={24} />
              </div>
              <p className="text-lg font-black uppercase tracking-[0.18em] text-text-primary">
                Paket
              </p>
              <p className="mt-2 text-sm font-bold text-text-secondary">
                {deliveryActiveCount} aktif sipariş
              </p>
            </Link>
          </div>

          <section className="rounded-sm border border-border-light bg-bg-surface p-4">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-text-primary">
              Günün Özeti
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xl font-black text-text-primary tabular-nums">
                  {todayOrderCount}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Sipariş
                </p>
              </div>
              <div>
                <p className="text-xl font-black text-success-main tabular-nums">
                  {formatCurrency(todayRevenue)}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Ciro
                </p>
              </div>
            </div>
          </section>
        </BodySection>
      </main>
    </div>
  )
}
