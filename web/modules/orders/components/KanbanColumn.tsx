'use client'

// ============================================
// KANBAN COLUMN
// Tek bir status sütunu - useDroppable ile bırakılabilir alan
// Bulk actions desteği
// ============================================

import { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'

import { OrderGroup, OrderStatus } from '../types'
import { OrderCard } from './OrderCard'
import { Clock, ChefHat, Check, Utensils, Truck, CheckCircle, CreditCard, XCircle, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'

interface KanbanColumnProps {
  status: OrderStatus
  label: string
  color: string
  icon: string
  orderGroups: OrderGroup[]
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void
  onOrderClick: (orderGroup: OrderGroup) => void
  onZoomClick?: (orderGroup: OrderGroup) => void
  isLoading?: boolean
  isCompact?: boolean
  onMarkAllReady?: () => void
  onMarkAllServed?: () => void
}

// Icon mapping
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Clock,
  ChefHat,
  Check,
  Utensils,
  Truck,
  CheckCircle,
  CreditCard,
  XCircle,
}

// Color mapping
const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; badge: string; hover: string }> = {
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-800',
    hover: 'hover:border-yellow-300',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-800',
    hover: 'hover:border-blue-300',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    badge: 'bg-green-100 text-green-800',
    hover: 'hover:border-green-300',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800',
    badge: 'bg-purple-100 text-purple-800',
    hover: 'hover:border-purple-300',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    badge: 'bg-orange-100 text-orange-800',
    hover: 'hover:border-orange-300',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-800',
    hover: 'hover:border-red-300',
  },
}

export function KanbanColumn({
  status,
  label,
  color,
  icon,
  orderGroups,
  onStatusChange,
  onOrderClick,
  onZoomClick,
  isLoading = false,
  isCompact = false,
  onMarkAllReady,
  onMarkAllServed,
}: KanbanColumnProps) {
  const IconComponent = ICONS[icon] || Clock
  const colors = COLOR_CLASSES[color] || COLOR_CLASSES.yellow

  // Droppable setup
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })



  // Calculate column totals
  const totalAmount = useMemo(
    () => orderGroups.reduce((sum, g) => sum + (Number(g.totalAmount) || 0), 0),
    [orderGroups]
  )
  const totalItems = useMemo(
    () => orderGroups.reduce((sum, g) => sum + g.totalItems, 0),
    [orderGroups]
  )

  // Determine available bulk actions based on status
  const availableActions = useMemo(() => {
    const actions: { label: string; handler?: () => void; status?: OrderStatus }[] = []

    if (status === OrderStatus.PENDING && onMarkAllReady) {
      actions.push({
        label: 'Tümünü Hazırla',
        handler: onMarkAllReady,
        status: OrderStatus.PREPARING,
      })
    }

    if (status === OrderStatus.PREPARING && onMarkAllServed) {
      actions.push({
        label: 'Tümünü Hazır İşaretle',
        handler: onMarkAllServed,
        status: OrderStatus.READY,
      })
    }

    if (status === OrderStatus.READY) {
      if (onMarkAllServed) {
        actions.push({
          label: 'Tümünü Servis Edildi',
          handler: onMarkAllServed,
          status: OrderStatus.SERVED,
        })
      }
    }

    return actions
  }, [status, onMarkAllReady, onMarkAllServed])

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border transition-colors',
        isCompact ? 'w-48' : 'h-full',
        colors.bg,
        colors.border,
        isOver && 'ring-2 ring-primary-main ring-offset-2'
      )}
    >
      {/* Column Header */}
      <div className={cn('flex items-center justify-between p-3', isCompact ? 'py-2' : '')}>
        <div className="flex items-center gap-2">
          <IconComponent className={cn('w-4 h-4', colors.text)} />
          <span className={cn('font-semibold text-sm', colors.text)}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full', colors.badge)}>
            {orderGroups.length}
          </span>
          {/* Bulk actions dropdown could go here */}
        </div>
      </div>

      {/* Column Stats (non-compact only) */}
      {!isCompact && orderGroups.length > 0 && (
        <div className="px-3 pb-2 flex items-center justify-between text-xs text-text-muted">
          <span>{totalItems} ürün</span>
          <span className="font-medium">{Number(totalAmount || 0).toFixed(2)} TL</span>
        </div>
      )}

      {/* Cards */}
      <div
        className={cn(
          'flex-1 overflow-y-auto p-2 space-y-2 min-h-0',
          isCompact ? 'max-h-40' : ''
        )}
      >
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-white rounded-md h-24 border border-gray-200"
            />
          ))
        ) : orderGroups.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center h-24 text-text-muted text-sm">
            Sipariş yok
          </div>
        ) : (
          orderGroups.map(group => (
            <OrderCard
              key={group.tableId}
              orderGroup={group}
              onClick={() => onOrderClick(group)}
              onZoomClick={onZoomClick ? () => onZoomClick(group) : undefined}
              onStatusChange={onStatusChange}
              isCompact={isCompact}
            />
          ))
        )}
      </div>

    </div>
  )
}
