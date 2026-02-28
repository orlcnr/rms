// ============================================
// ORDER ZOOM MODAL
// Sipariş detay modalı - büyütülmüş görünüm
// ============================================

'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  Maximize2,
  Clock,
  User,
  MapPin,
  FileText,
  Printer,
  CreditCard,
  Layers,
  ChefHat,
  Check,
  X,
  Utensils,
  Truck,
} from 'lucide-react'
import { Modal } from '@/modules/shared/components/Modal'
import { OrderGroup, OrderStatus, ORDER_STATUS_LABELS, OrderType, ORDER_TYPE_LABELS } from '../types'
import { OrderStatusBadge } from './OrderStatusBadge'
import { cn } from '@/modules/shared/utils/cn'

interface OrderZoomModalProps {
  isOpen: boolean
  onClose: () => void
  orderGroup: OrderGroup | null
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void
}

// Status icon mapping
const STATUS_ICONS: Record<OrderStatus, React.ComponentType<{ className?: string }>> = {
  [OrderStatus.PENDING]: Clock,
  [OrderStatus.PREPARING]: ChefHat,
  [OrderStatus.READY]: Check,
  [OrderStatus.SERVED]: Utensils,
  [OrderStatus.PAID]: CreditCard,
  [OrderStatus.ON_WAY]: Truck,
  [OrderStatus.DELIVERED]: Check,
  [OrderStatus.CANCELLED]: X,
}

export function OrderZoomModal({
  isOpen,
  onClose,
  orderGroup,
  onStatusChange,
}: OrderZoomModalProps) {
  if (!orderGroup) return null

  // Format dates
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: tr })
  }

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm', { locale: tr })
  }

  const isCompleted = orderGroup.status === OrderStatus.SERVED ||
    orderGroup.status === OrderStatus.PAID ||
    orderGroup.status === OrderStatus.CANCELLED

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`SİPARİŞ DETAYI - ${orderGroup.tableName}`}
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col h-[80vh]">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-bg-app border border-border-light rounded-sm">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">MASA TOPLAMI</p>
            <p className="text-3xl font-black text-primary-main tracking-tighter tabular-nums">
              {orderGroup.totalAmount.toFixed(2)} <span className="text-sm">TL</span>
            </p>
          </div>
          <div className="p-4 bg-bg-app border border-border-light rounded-sm">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">TOPLAM ÜRÜN</p>
            <p className="text-3xl font-black text-text-primary tabular-nums">
              {orderGroup.totalItems} <span className="text-sm">ADET</span>
            </p>
          </div>
          <div className="p-4 bg-bg-app border border-border-light rounded-sm flex flex-col justify-center">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">DURUM</p>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-2.5 h-2.5 rounded-full animate-pulse",
                isCompleted ? "bg-text-muted" : "bg-success-main"
              )} />
              <span className="text-sm font-black text-text-primary uppercase">
                {ORDER_STATUS_LABELS[orderGroup.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-border-light">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-text-muted" />
              <span className="text-xs font-black uppercase tracking-widest text-text-primary">MÜŞTERİ:</span>
              <span className="text-xs font-bold text-text-secondary">{orderGroup.customerName || 'BİLİNMİYOR'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-text-muted" />
              <span className="text-xs font-black uppercase tracking-widest text-text-primary">İLK SİPARİŞ:</span>
              <span className="text-xs font-bold text-text-secondary">{formatDate(orderGroup.firstOrderTime)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-text-muted" />
              <span className="text-xs font-black uppercase tracking-widest text-text-primary">SİPARİŞ SAYISI:</span>
              <span className="text-xs font-bold text-text-secondary">{orderGroup.orders.length} PARÇA</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-text-muted" />
              <span className="text-xs font-black uppercase tracking-widest text-text-primary">SON GÜNCELLEME:</span>
              <span className="text-xs font-bold text-text-secondary">{formatDate(orderGroup.lastOrderTime)}</span>
            </div>
          </div>
        </div>

        {/* Grouped Items Content */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
          {/* AKTİF DALGA */}
          {orderGroup.activeWaveItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-primary-main animate-pulse" />
                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">SON GELEN İSTEKLER</h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {orderGroup.activeWaveItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-primary-main/5 p-4 rounded-sm border border-primary-main/20 hover:bg-primary-main/10 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-base font-black text-text-primary">
                        <span className="text-primary-main mr-3 text-lg">{item.quantity}x</span>
                        {item.menuItem?.name}
                      </span>
                      {item.notes && <span className="text-xs text-warning-main font-bold mt-1 uppercase italic bg-warning-bg/30 px-2 py-0.5 rounded-sm">NOT: {item.notes}</span>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-lg font-black text-text-primary tabular-nums">{Number(item.totalPrice || 0).toFixed(2)} TL</span>
                      <span className="text-[10px] font-black text-primary-main uppercase bg-primary-subtle px-3 py-1 rounded-full">{ORDER_STATUS_LABELS[item.status]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ÖNCEKİ İSTEKLER */}
          {orderGroup.previousItems.length > 0 && (
            <div className="pt-6 border-t border-border-light">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-black text-text-muted uppercase tracking-widest">ÖNCEKİ İSTEKLER</h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {orderGroup.previousItems.map((item, idx) => {
                  const isServed = item.status === OrderStatus.SERVED || item.status === OrderStatus.PAID
                  return (
                    <div key={idx} className={cn(
                      "flex justify-between items-center p-4 rounded-sm border transition-all",
                      isServed ? "bg-bg-app border-border-light opacity-60" : "bg-bg-surface border-border-light"
                    )}>
                      <div className="flex flex-col">
                        <span className={cn("text-base font-bold text-text-primary", isServed && "line-through grayscale opacity-50")}>
                          <span className="text-text-muted mr-3">{item.quantity}x</span>
                          {item.menuItem?.name}
                        </span>
                        <span className="text-[10px] text-text-muted mt-1 uppercase font-bold tracking-widest">{formatTime(item.created_at)}</span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-base font-bold text-text-primary tabular-nums">{Number(item.totalPrice || 0).toFixed(2)} TL</span>
                        {isServed ? (
                          <span className="text-[10px] font-black text-success-main uppercase bg-success-subtle px-3 py-1 rounded-full">SERVİS EDİLDİ</span>
                        ) : (
                          <span className="text-[10px] font-black text-text-muted uppercase border border-border-light px-3 py-1 rounded-full">{ORDER_STATUS_LABELS[item.status]}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ARŞİV */}
          {orderGroup.servedItems.length > 0 && (
            <div className="pt-6 border-t border-border-light">
              <div className="flex items-center gap-2 mb-4 opacity-50">
                <h3 className="text-sm font-black text-text-muted uppercase tracking-widest">ARŞİV / BİTENLER</h3>
              </div>
              <div className="grid grid-cols-1 gap-2 grayscale opacity-40">
                {orderGroup.servedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-sm border border-dashed border-border-light bg-bg-app">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-primary line-through italic">
                        <span className="mr-3">{item.quantity}x</span>
                        {item.menuItem?.name}
                      </span>
                      <span className="text-[10px] text-text-muted mt-1 uppercase font-bold tracking-widest">TAMAMLANDI: {formatTime(item.created_at)}</span>
                    </div>
                    <span className="text-[10px] font-black text-text-muted uppercase bg-bg-muted px-2 py-1 rounded-sm">ARŞİV</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
