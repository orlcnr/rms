// ============================================
// PAID ORDERS SECTION
// Ödenmiş siparişlerin gösterildiği bölüm
// ============================================

'use client'

import {
  CheckCircle,
  Maximize2,
  Clock,
  Receipt,
} from 'lucide-react'
import { OrderGroup } from '../../types'
import { cn } from '@/modules/shared/utils/cn'

interface PaidOrdersSectionProps {
  orders: OrderGroup[]
  onOrderClick: (orderGroup: OrderGroup) => void
  onZoomClick: (orderGroup: OrderGroup) => void
  isLoading?: boolean
  isModalView?: boolean
}

export function PaidOrdersSection({
  orders,
  onOrderClick,
  onZoomClick,
  isLoading = false,
  isModalView = false,
}: PaidOrdersSectionProps) {
  // Calculate totals
  const totalAmount = orders.reduce((sum, group) => sum + (Number(group.totalAmount) || 0), 0)
  const totalOrders = orders.length

  return (
    <div className={cn(
      "flex flex-col h-full",
      !isModalView && "flex-shrink-0 border-t border-border-light bg-success-bg/10"
    )}>
      {/* Header - Only show if NOT in modal view (Modal has its own title) */}
      {!isModalView && (
        <div className="flex items-center justify-between px-4 py-3 bg-success-subtle/20 border-b border-success-border/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success-main" />
            <span className="text-sm font-semibold text-success-text">
              Ödenen Siparişler
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 rounded-full bg-success-bg text-success-text">
              {totalOrders} sipariş
            </span>
            <span className="text-sm font-bold text-success-text">
              {totalAmount.toFixed(2)} TL
            </span>
          </div>
        </div>
      )}

      {/* Summary for Modal View */}
      {isModalView && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-bg-app border border-border-light rounded-sm">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">TOPLAM TAHSİLAT</p>
            <p className="text-2xl font-black text-success-main tabular-nums">{totalAmount.toFixed(2)} TL</p>
          </div>
          <div className="p-4 bg-bg-app border border-border-light rounded-sm">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">KAPANAN MASA</p>
            <p className="text-2xl font-black text-text-primary tabular-nums">{totalOrders} ADET</p>
          </div>
        </div>
      )}

      {/* Orders Grid/List */}
      <div className={cn(
        "p-1",
        isModalView
          ? "grid grid-cols-2 md:grid-cols-3 gap-4"
          : "flex gap-3 px-4 py-3 overflow-x-auto min-h-[140px]"
      )}>
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "bg-bg-muted animate-pulse rounded-md",
                isModalView ? "h-32" : "w-48 h-24"
              )}
            />
          ))
        ) : orders.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center col-span-full py-12 text-text-muted text-sm">
            <Receipt className="w-8 h-8 mb-2 opacity-20" />
            <p className="font-bold uppercase tracking-widest">Henüz kapanmış bir sipariş yok</p>
          </div>
        ) : (
          // Orders
          orders.map((group) => (
            <div
              key={group.tableId}
              onClick={() => onOrderClick(group)}
              className={cn(
                "flex flex-col bg-white rounded-sm border border-border-light p-4 cursor-pointer hover:shadow-lg transition-all active:scale-[0.98] group relative",
                isModalView ? "w-full" : "w-56 flex-shrink-0"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <span className="font-black text-sm text-text-primary truncate block uppercase tracking-tight">
                    {group.tableName}
                  </span>
                  {group.customerName && (
                    <span className="text-[10px] text-text-muted truncate block font-bold uppercase tracking-wider">
                      {group.customerName}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onZoomClick(group)
                  }}
                  className="p-1.5 rounded-sm bg-bg-app text-text-muted hover:text-primary-main hover:bg-primary-subtle transition-all"
                  aria-label="Siparişi büyüt"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-tighter">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(group.lastOrderTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <span className="text-base font-black text-success-main tabular-nums">
                  {Number(group.totalAmount || 0).toFixed(2)} TL
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-border-light/50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-text-muted uppercase">
                  {group.orders.length} PARÇA
                </span>
                <span className="text-[10px] font-bold text-text-muted uppercase">
                  {group.totalItems} ÜRÜN
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
