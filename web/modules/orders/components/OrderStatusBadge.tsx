// ============================================
// ORDER STATUS BADGE COMPONENT
// Design Tokens kullanımı zorunlu
// ============================================

import React from 'react'
import { OrderStatus, ORDER_STATUS_LABELS } from '../types'
import { cn } from '@/modules/shared/utils/cn'

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

/**
 * Status'a göre renk belirle
 */
const getStatusStyles = (status: OrderStatus): { bg: string; text: string; border: string } => {
  const styles: Record<OrderStatus, { bg: string; text: string; border: string }> = {
    [OrderStatus.PENDING]: {
      bg: 'bg-warning-subtle',
      text: 'text-warning-main',
      border: 'border-warning-main/30',
    },
    [OrderStatus.PREPARING]: {
      bg: 'bg-info-subtle',
      text: 'text-info-main',
      border: 'border-info-main/30',
    },
    [OrderStatus.READY]: {
      bg: 'bg-success-subtle',
      text: 'text-success-main',
      border: 'border-success-main/30',
    },
    [OrderStatus.SERVED]: {
      bg: 'bg-primary-subtle',
      text: 'text-primary-main',
      border: 'border-primary-main/30',
    },
    [OrderStatus.PAID]: {
      bg: 'bg-success-subtle',
      text: 'text-success-main',
      border: 'border-success-main/30',
    },
    [OrderStatus.ON_WAY]: {
      bg: 'bg-info-subtle',
      text: 'text-info-main',
      border: 'border-info-main/30',
    },
    [OrderStatus.DELIVERED]: {
      bg: 'bg-success-subtle',
      text: 'text-success-main',
      border: 'border-success-main/30',
    },
    [OrderStatus.CANCELLED]: {
      bg: 'bg-danger-subtle',
      text: 'text-danger-main',
      border: 'border-danger-main/30',
    },
  }

  return styles[status] || styles[OrderStatus.PENDING]
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const { bg, text, border } = getStatusStyles(status)
  const label = ORDER_STATUS_LABELS[status]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider',
        bg,
        text,
        border,
        'border',
        className
      )}
    >
      {label}
    </span>
  )
}

// ============================================
// STATUS BUTTON COMPONENT (Quick Actions)
// ============================================

interface StatusAction {
  status: OrderStatus
  label: string
  variant: 'primary' | 'secondary' | 'danger' | 'success'
}

interface OrderStatusActionsProps {
  currentStatus: OrderStatus
  onStatusChange: (status: OrderStatus) => void
  disabled?: boolean
}

/**
 * Mevcut duruma göre yapılabilecek aksiyonları döner
 */
export function getAvailableActions(
  currentStatus: OrderStatus,
  onStatusChange: (status: OrderStatus) => void
): StatusAction[] {
  const actions: Record<OrderStatus, StatusAction[]> = {
    [OrderStatus.PENDING]: [
      { status: OrderStatus.PREPARING, label: 'Hazırla', variant: 'primary' },
      { status: OrderStatus.CANCELLED, label: 'İptal', variant: 'danger' },
    ],
    [OrderStatus.PREPARING]: [
      { status: OrderStatus.READY, label: 'Hazır', variant: 'primary' },
      { status: OrderStatus.CANCELLED, label: 'İptal', variant: 'danger' },
    ],
    [OrderStatus.READY]: [
      { status: OrderStatus.SERVED, label: 'Servis Et', variant: 'primary' },
      { status: OrderStatus.CANCELLED, label: 'İptal', variant: 'danger' },
    ],
    [OrderStatus.SERVED]: [
      { status: OrderStatus.PAID, label: 'Öde', variant: 'success' },
    ],
    [OrderStatus.PAID]: [],
    [OrderStatus.ON_WAY]: [
      { status: OrderStatus.DELIVERED, label: 'Teslim Et', variant: 'primary' },
    ],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  }

  return actions[currentStatus] || []
}

export function OrderStatusActions({
  currentStatus,
  onStatusChange,
  disabled = false,
}: OrderStatusActionsProps) {
  const actions = getAvailableActions(currentStatus, onStatusChange)

  if (actions.length === 0) {
    return null
  }

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <button
          key={action.status}
          onClick={() => onStatusChange(action.status)}
          disabled={disabled}
          className={cn(
            'px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider',
            'transition-all duration-200',
            'focus:outline-none focus:ring-1 focus:ring-offset-1',
            action.variant === 'primary' && 'bg-primary-main text-text-inverse hover:bg-primary-hover focus:ring-primary-main',
            action.variant === 'success' && 'bg-success-main text-text-inverse hover:opacity-95 focus:ring-success-main',
            action.variant === 'danger' && 'bg-danger-main text-text-inverse hover:opacity-95 focus:ring-danger-main',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
