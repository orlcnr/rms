// ============================================
// ORDER DETAIL DRAWER
// Sipariş detay çekmecesi (drawer)
// ============================================

'use client'

import { useMemo } from 'react'
import { X, Clock, User, FileText, Printer, CreditCard } from 'lucide-react'
import { OrderGroup, OrderStatus, ORDER_STATUS_LABELS, OrderType, ORDER_TYPE_LABELS } from '../types'
import { OrderStatusBadge } from './OrderStatusBadge'
import { formatDateTime } from '@/modules/shared/utils/date'
import { cn } from '@/modules/shared/utils/cn'
import { aggregateOrderItemsForDisplay } from '../utils/order-item-display'

interface OrderDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  orderGroup: OrderGroup | null
  onPrint: (group: OrderGroup) => void
  onEditOrder: (group: OrderGroup) => void
  onTakePayment: (group: OrderGroup) => void
}

export function OrderDetailDrawer({
  isOpen,
  onClose,
  orderGroup,
  onPrint,
  onEditOrder,
  onTakePayment,
}: OrderDetailDrawerProps) {
  const latestOrder = orderGroup ? orderGroup.orders[orderGroup.orders.length - 1] : null
  const activeWaveItems = useMemo(
    () => aggregateOrderItemsForDisplay(orderGroup?.activeWaveItems ?? []),
    [orderGroup?.activeWaveItems],
  )
  const previousItems = useMemo(
    () => aggregateOrderItemsForDisplay(orderGroup?.previousItems ?? []),
    [orderGroup?.previousItems],
  )
  const servedItems = useMemo(
    () => aggregateOrderItemsForDisplay(orderGroup?.servedItems ?? []),
    [orderGroup?.servedItems],
  )

  if (!isOpen || !orderGroup || !latestOrder) return null

  const order = latestOrder
  const hasTable = Boolean(order.tableId)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {orderGroup.tableName}
            </h2>
            {orderGroup.customerName && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <User className="w-3 h-3" />
                {orderGroup.customerName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Order Status */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Sipariş Durumu</h3>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onPrint(orderGroup)}
              className="flex items-center justify-center gap-1 rounded-sm border border-border-light bg-bg-surface px-2 py-2 text-[10px] font-black uppercase tracking-wider text-text-primary hover:bg-bg-muted"
            >
              <Printer className="h-3.5 w-3.5" />
              Yazdır
            </button>
            <button
              type="button"
              onClick={() => onEditOrder(orderGroup)}
              disabled={!hasTable}
              className="flex items-center justify-center gap-1 rounded-sm border border-border-light bg-bg-surface px-2 py-2 text-[10px] font-black uppercase tracking-wider text-text-primary hover:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sipariş Güncelle
            </button>
            <button
              type="button"
              onClick={() => onTakePayment(orderGroup)}
              disabled={!hasTable}
              className="flex items-center justify-center gap-1 rounded-sm border border-success-main/30 bg-success-subtle px-2 py-2 text-[10px] font-black uppercase tracking-wider text-success-main hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Ödeme Al
            </button>
          </div>
          {!hasTable && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Bu siparişte masa olmadığı için güncelleme ve ödeme aksiyonları pasif.
            </p>
          )}

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Sipariş Tipi</p>
              <p className="text-sm font-medium">
                {ORDER_TYPE_LABELS[order.type as OrderType] || order.type}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sipariş No</p>
              <p className="text-sm font-medium">#{order.orderNumber || order.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">İlk Sipariş</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDateTime(orderGroup.firstOrderTime)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Son Güncelleme</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDateTime(orderGroup.lastOrderTime)}
              </p>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Sipariş Notu
              </h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {order.notes}
              </p>
            </div>
          )}

          {/* Grouped Items (Matching Card grouping) */}
          <div className="space-y-6">
            {/* AKTİF DALGA */}
            {activeWaveItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-primary-main animate-pulse" />
                  <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Son İstekler (Aktif)</h3>
                </div>
                <div className="space-y-2">
                  {activeWaveItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-primary-main/5 p-3 rounded-sm border border-primary-main/10 transition-all hover:bg-primary-main/10">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-text-primary">
                          <span className="text-primary-main mr-2">{item.quantity}x</span>
                          {item.menuItem?.name}
                        </span>
                        <span className="text-[10px] text-text-muted mt-0.5 uppercase font-bold tracking-tight">Eklendi: {formatDateTime(item.created_at)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-text-primary">{Number(item.totalPrice || 0).toFixed(2)} TL</span>
                        <span className="text-[9px] text-primary-main uppercase font-black mt-1 bg-primary-main/10 px-1.5 py-0.5 rounded-full">{ORDER_STATUS_LABELS[item.status]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ÖNCEKİ İSTEKLER */}
            {previousItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 border-t border-gray-100 pt-4">
                  <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">Önceki İstekler</h3>
                </div>
                <div className="space-y-2">
                  {previousItems.map((item, idx) => {
                    const isServed =
                      item.status === OrderStatus.SERVED ||
                      item.status === OrderStatus.DELIVERED ||
                      item.status === OrderStatus.PAID
                    return (
                      <div key={idx} className={cn(
                        "flex justify-between items-center p-3 rounded-sm border border-border-light transition-all",
                        isServed ? "opacity-50 bg-bg-muted" : "bg-bg-surface"
                      )}>
                        <div className="flex flex-col">
                          <span className={cn("text-sm font-bold text-text-primary", isServed && "line-through grayscale")}>
                            <span className="text-text-muted mr-2">{item.quantity}x</span>
                            {item.menuItem?.name}
                          </span>
                          <span className="text-[10px] text-text-muted mt-0.5 uppercase font-bold tracking-tight">{formatDateTime(item.created_at)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-text-primary">{Number(item.totalPrice || 0).toFixed(2)} TL</span>
                          <span
                            className={cn(
                              'text-[9px] uppercase font-bold mt-1 px-1.5 py-0.5 rounded-full border',
                              isServed
                                ? 'text-success-main bg-success-subtle border-success-main/30'
                                : 'text-text-muted border-border-light'
                            )}
                          >
                            {ORDER_STATUS_LABELS[item.status]}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ARŞİVLENMİŞ / SERVİS BİTENLER */}
            {servedItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 border-t border-gray-100 pt-4">
                  <h3 className="text-xs font-black text-text-muted uppercase tracking-widest opacity-60">Arşiv / Bitenler</h3>
                </div>
                <div className="space-y-2 opacity-50 grayscale">
                  {servedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-sm border border-dashed border-border-light bg-bg-muted/30">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-text-muted line-through">
                          <span className="mr-2">{item.quantity}x</span>
                          {item.menuItem?.name}
                        </span>
                        <span className="text-[10px] text-text-muted mt-0.5 uppercase font-bold tracking-tight">Servis Bitti: {formatDateTime(item.created_at)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-text-muted uppercase font-bold bg-bg-muted px-1.5 py-0.5 rounded-full">ARŞİV</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="bg-bg-app border border-border-light rounded-sm p-5 mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Öngörülen Toplam</span>
              <span className="text-2xl font-black text-primary-main tabular-nums tracking-tighter">{Number(orderGroup.totalAmount || 0).toFixed(2)} TL</span>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-border-light/50">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{orderGroup.totalItems} Toplam Ürün</span>
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-success-main uppercase tracking-widest bg-success-subtle px-2 py-0.5 rounded-full">{orderGroup.orders.length} Sipariş Parçası</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
