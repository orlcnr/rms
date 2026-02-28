// ============================================
// ORDER QUICK ACTIONS
// Sipariş kartı hızlı aksiyonları (dropdown)
// ============================================

'use client'

import { OrderGroup, OrderStatus, ORDER_STATUS_LABELS, getNextStatusOptions, isOrderCancellable } from '../types'
import { X, Printer, CreditCard, Move } from 'lucide-react'

interface OrderQuickActionsProps {
  orderGroup: OrderGroup
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void
  onClose: () => void
}

// Status transitions for different order types
const DINE_IN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.CANCELLED],
  [OrderStatus.SERVED]: [OrderStatus.PAID],
  [OrderStatus.PAID]: [],
  [OrderStatus.ON_WAY]: [],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
}

const TAKEAWAY_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.ON_WAY, OrderStatus.CANCELLED],
  [OrderStatus.SERVED]: [],
  [OrderStatus.PAID]: [],
  [OrderStatus.ON_WAY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
}

export function OrderQuickActions({
  orderGroup,
  onStatusChange,
  onClose,
}: OrderQuickActionsProps) {
  const latestOrder = orderGroup.orders[orderGroup.orders.length - 1]
  const currentStatus = latestOrder?.status || OrderStatus.PENDING
  const orderType = orderGroup.orderType

  // Get valid transitions based on order type
  const getValidTransitions = (): OrderStatus[] => {
    if (orderType === 'delivery') {
      return TAKEAWAY_TRANSITIONS[currentStatus] || []
    }
    return DINE_IN_TRANSITIONS[currentStatus] || []
  }

  const validTransitions = getValidTransitions()
  const canCancel = isOrderCancellable(currentStatus)

  const handleStatusClick = (newStatus: OrderStatus) => {
    // Update the latest order's status
    onStatusChange(latestOrder.id, newStatus)
    onClose()
  }

  const handleMoveTable = () => {
    // TODO: Implement move table functionality
    console.log('Move table:', latestOrder.id)
    onClose()
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
      {/* Status change buttons */}
      {validTransitions.length > 0 && (
        <div className="border-b border-gray-100 pb-1 mb-1">
          <p className="text-xs text-gray-400 px-2 py-1">Durum Değiştir</p>
          {validTransitions.map(status => (
            <button
              key={status}
              onClick={() => handleStatusClick(status)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <span
                className={`w-2 h-2 rounded-full ${status === OrderStatus.CANCELLED
                    ? 'bg-red-500'
                    : status === OrderStatus.PAID
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
              />
              {ORDER_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      )}

      {/* Move table button */}
      <button
        onClick={handleMoveTable}
        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
      >
        <Move className="w-4 h-4 text-gray-600" />
        Masa Değiştir
      </button>

      {/* Cancel button */}
      {canCancel && (
        <button
          onClick={() => handleStatusClick(OrderStatus.CANCELLED)}
          className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
        >
          <X className="w-4 h-4" />
          İptal Et
        </button>
      )}
    </div>
  )
}
