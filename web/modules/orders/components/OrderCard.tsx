// ============================================
// ORDER CARD
// Sipariş kartı - useSortable ile sarmalanmış (draggable)
// Zoom butonu, istek vurgulama ve stale indicator eklendi
// ============================================

'use client'

import { useState, useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { formatDistance } from 'date-fns'
import { tr } from 'date-fns/locale'
import { OrderGroup, OrderStatus, ORDER_STATUS_LABELS, OrderType, ORDER_TYPE_LABELS } from '../types'
import { getNow, formatTime, parseISO } from '@/modules/shared/utils/date'
import { ChevronDown, ChevronUp, Layers, AlertCircle, Maximize2 } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'

interface OrderCardProps {
  orderGroup: OrderGroup
  onClick: () => void
  onZoomClick?: () => void
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void
  isCompact?: boolean
}

export function OrderCard({
  orderGroup,
  onClick,
  onZoomClick,
  onStatusChange,
  isCompact = false,
}: OrderCardProps) {
  const [isServedExpanded, setIsServedExpanded] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: orderGroup.tableId,
    data: orderGroup.orders[0],
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  // Timer logic - Use activeWaveTime (Resets when a new order or item comes in)
  const waveTime = parseISO(orderGroup.activeWaveTime)
  const now = getNow()

  const timeAgo = formatDistance(waveTime, now, {
    addSuffix: true,
    locale: tr,
  })

  const timeElapsed = Math.floor((now.getTime() - waveTime.getTime()) / (1000 * 60))

  // Time color based on elapsed (stale indicator)
  const getTimeColor = () => {
    if (timeElapsed < 10) return 'text-green-600'
    if (timeElapsed < 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Stale indicator class
  const staleIndicator = useMemo(() => {
    if (timeElapsed >= 30) return 'stale-critical'
    if (timeElapsed >= 15) return 'stale-warning'
    return null
  }, [timeElapsed])

  // New Wave Badge - if activeWaveTime is less than 2 minutes ago
  const isVeryNew = timeElapsed < 2

  if (isCompact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-white rounded border border-gray-200 p-2 cursor-grab active:cursor-grabbing"
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate">
            {orderGroup.tableName}
          </span>
          <span className="text-xs text-gray-500">
            {orderGroup.totalItems}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {Number(orderGroup.totalAmount || 0).toFixed(2)} TL
        </div>
      </div>
    )
  }

  const isCompleted = orderGroup.status === OrderStatus.SERVED ||
    orderGroup.status === OrderStatus.DELIVERED ||
    orderGroup.status === OrderStatus.PAID

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all relative overflow-hidden',
        isCompleted ? 'bg-gray-50 opacity-70 grayscale-[0.5]' : 'bg-white',
        !isCompleted && isVeryNew && 'ring-2 ring-primary-main ring-offset-1',
        !isCompleted && staleIndicator === 'stale-critical' && 'border-danger-main animate-pulse',
        !isCompleted && staleIndicator === 'stale-warning' && 'border-warning-main',
        (!staleIndicator || isCompleted) && 'border-gray-200'
      )}
      onClick={onClick}
    >
      {/* New Wave Alert Overlay */}
      {isVeryNew && !isCompleted && (
        <div className="absolute top-0 left-0 bg-primary-main text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-br-lg z-10 animate-bounce">
          YENİ İSTEK
        </div>
      )}

      {/* Header */}
      <div className={cn("p-3 border-b relative", isCompleted ? "border-gray-200" : "border-gray-100", isVeryNew && "pt-6")}>
        {/* Zoom Button */}
        {onZoomClick && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onZoomClick()
            }}
            className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Siparişi büyüt"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center justify-between pr-8">
          <div>
            <h4 className="font-semibold text-text-primary">
              {orderGroup.tableName}
            </h4>
            {orderGroup.customerName && (
              <p className="text-sm text-text-muted font-bold uppercase tracking-wider">{orderGroup.customerName}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
          </div>
        </div>

        {/* Dynamic Timer - Based on Active Wave */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex flex-col">
            {!isCompleted && (
              <>
                <span className={cn('text-[10px] font-bold uppercase tracking-tight', getTimeColor())}>
                  {isVeryNew ? 'Şimdi Geldi' : 'Bekleyen Sipariş'}
                </span>
                <span className={cn('text-xs font-medium flex items-center gap-1', getTimeColor())}>
                  {staleIndicator === 'stale-critical' && <AlertCircle className="w-3 h-3" />}
                  {timeAgo}
                </span>
              </>
            )}
            {isCompleted && (
              <span className="text-[10px] font-bold uppercase tracking-tight text-text-muted">
                Servis Tamamlandı
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-text-primary tabular-nums">
            {Number(orderGroup.totalAmount || 0).toFixed(2)} TL
          </span>
        </div>
      </div>

      <div className="p-3">
        {/* AKTİF DALGA (Yeni Gelenler - Son Sipariş) */}
        {orderGroup.activeWaveItems.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary-main animate-pulse" />
              <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Son İstek (Masadan Yeni)</span>
            </div>
            <div className="space-y-1.5">
              {orderGroup.activeWaveItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-semibold bg-primary-main/5 p-1.5 rounded border border-primary-main/10">
                  <span className="text-text-primary">
                    <span className="text-primary-main mr-1.5 font-black">{item.quantity}x</span>
                    {item.menuItem?.name}
                  </span>
                  <span className="text-[9px] text-primary-main uppercase font-black bg-primary-main/10 px-1.5 py-0.5 rounded-full">{ORDER_STATUS_LABELS[item.status]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÖNCEKİ İSTEKLER (Masadaki Diğer Bekleyenler) */}
        {orderGroup.previousItems.length > 0 && (
          <div className="mb-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-1">Önceki İstekler</span>
            </div>
            <div className="space-y-1">
              {orderGroup.previousItems.map((item, idx) => {
                const isServed = item.status === OrderStatus.SERVED || item.status === OrderStatus.DELIVERED || item.status === OrderStatus.PAID
                return (
                  <div key={idx} className={cn(
                    "flex justify-between items-center text-[11px] px-1.5 py-1 rounded-sm",
                    isServed ? "opacity-40 grayscale bg-bg-muted" : "font-medium text-text-muted"
                  )}>
                    <span className={cn(isServed && "line-through italic")}>{item.quantity}x {item.menuItem?.name}</span>
                    {isServed && (
                      <span className="text-[8px] text-success-main uppercase font-black">SERVİS EDİLDİ</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SERVİS EDİLENLER (Arşiv - 30dk Geçenler) */}
        {orderGroup.servedItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-dashed border-border-light">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsServedExpanded(!isServedExpanded)
              }}
              className="w-full flex items-center justify-between text-[10px] font-bold text-text-muted hover:text-text-primary uppercase tracking-wider"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3 h-3" />
                <span>Arşiv / Servis Bitenler ({orderGroup.servedItems.length})</span>
              </div>
              {isServedExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isServedExpanded && (
              <div className="mt-2 space-y-1 opacity-40">
                {orderGroup.servedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[10px] px-1 line-through text-text-muted italic">
                    <span>{item.quantity}x {item.menuItem?.name}</span>
                    <span>{formatTime(item.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
