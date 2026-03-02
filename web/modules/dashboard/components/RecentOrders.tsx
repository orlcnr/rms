'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/modules/shared/utils/cn'
import { Button } from '@/modules/shared/components/Button'
import { RecentOrder } from '../types'

interface RecentOrdersProps {
  orders: RecentOrder[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

function getStatusLabel(status: RecentOrder['status']): string {
  switch (status) {
    case 'pending':
      return 'BEKLİYOR'
    case 'preparing':
      return 'HAZIRLANIYOR'
    case 'ready':
      return 'HAZIR'
    case 'served':
      return 'SERVİS'
    case 'paid':
      return 'ÖDENDİ'
    case 'on_way':
      return 'YOLDA'
    case 'delivered':
      return 'TESLİM'
    case 'cancelled':
      return 'İPTAL'
    default:
      return status.toUpperCase()
  }
}

function getStatusClass(status: RecentOrder['status']): string {
  if (status === 'preparing' || status === 'pending') return 'bg-primary-subtle text-primary-main'
  if (status === 'on_way' || status === 'ready' || status === 'served') return 'bg-warning-bg text-warning-main'
  if (status === 'paid' || status === 'delivered') return 'bg-success-bg text-success-main'
  return 'bg-danger-bg text-danger-main'
}

export function RecentOrders({ orders, isLoading, error, onRetry }: RecentOrdersProps) {
  const totalActiveOrders = orders.length

  return (
    <section className="bg-bg-surface border border-border-light rounded-sm shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 pb-3">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-primary-main rounded-full" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.15em]">SON SİPARİŞLER</h2>
          </div>
          <Link
            href="/orders"
            className="text-xs font-semibold text-text-muted hover:text-primary-main transition-colors tracking-widest uppercase flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-primary-main"
            aria-label="Tüm siparişleri görüntüle"
          >
            TAM LİSTE <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {error && !isLoading ? (
          <div className="border border-danger-main/20 rounded-sm p-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-danger-main">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>TEKRAR DENE</Button>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[420px] scrollbar-thin scrollbar-thumb-border-medium">
            <table className="w-full erp-table">
              <thead className="sticky top-0 z-10">
                <tr className="bg-bg-muted">
                  <th className="text-left w-44 px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">SİPARİŞ ID</th>
                  <th className="text-left w-28 px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">MASA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">MÜŞTERİ</th>
                  <th className="text-center w-24 px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">SAAT</th>
                  <th className="text-right w-28 px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">TUTAR</th>
                  <th className="text-right w-32 px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">DURUM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/50">
                {isLoading && orders.length === 0 ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}><td colSpan={6} className="px-4 py-5"><div className="h-4 bg-bg-muted rounded-sm animate-pulse" /></td></tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted text-xs font-bold uppercase tracking-wider">KAYIT BULUNAMADI</td></tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-bg-muted/50 transition-colors duration-150 group cursor-pointer">
                      <td className="px-4 py-3"><span className="text-sm font-semibold text-text-secondary tabular-nums block truncate max-w-[220px]">{order.displayId}</span></td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-muted font-black tracking-widest uppercase">{order.tableCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-normal text-text-primary uppercase tracking-tight truncate block">
                          {order.customerName && order.customerName !== '-' ? order.customerName : 'MİSAFİR'}
                        </span>
                      </td>
                      <td className="text-center px-4 py-3"><span className="text-sm font-semibold text-text-secondary tabular-nums">{order.time}</span></td>
                      <td className="text-right px-4 py-3"><span className="text-sm font-black text-text-primary tabular-nums">₺{order.amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</span></td>
                      <td className="text-right px-4 py-3">
                        <span className={cn('text-xs font-semibold px-2 py-1 rounded-sm uppercase tracking-wider inline-block', getStatusClass(order.status))}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-border-light bg-bg-muted/30">
        <p className="text-xs text-text-muted font-semibold uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-main" />
          TOPLAM AKTİF SİPARİŞ: {totalActiveOrders}
        </p>
        <p className="mt-2 text-[11px] text-text-muted font-semibold uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-success-main" />
          VERİ SETİ CANLI OLARAK GÜNCELLENİR
        </p>
      </div>
    </section>
  )
}
