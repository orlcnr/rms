// ============================================
// USE KANBAN DND HOOK
// Drag-and-drop mantığı için custom hook
// ============================================

'use client'

import { useState, useCallback } from 'react'
import {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { OrderStatus, Order } from '../types'

interface UseKanbanDnDProps {
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>
}

interface UseKanbanDnDReturn {
  sensors: ReturnType<typeof useSensors>
  activeOrder: Order | null
  isDragging: boolean
  handleDragStart: (event: DragStartEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
  handleDragOver: (event: DragOverEvent) => void
}

export function useKanbanDnD({
  onStatusChange,
}: UseKanbanDnDProps): UseKanbanDnDReturn {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  )

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const orderData = active.data.current as Order | undefined

    if (orderData) {
      setActiveOrder(orderData)
      setIsDragging(true)
    }
  }, [])

  // Handle drag end - This is where the status change happens
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    // Reset drag state
    setIsDragging(false)
    setActiveOrder(null)

    if (!over) {
      return
    }

    const activeOrderId = active.id as string
    const newStatus = over.id as OrderStatus

    // Get the current order status from the data
    const activeOrderData = active.data.current as Order | undefined
    const currentStatus = activeOrderData?.status

    // Don't do anything if the status hasn't changed
    if (!currentStatus || currentStatus === newStatus) {
      return
    }

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.CANCELLED, OrderStatus.PAID],
      [OrderStatus.SERVED]: [OrderStatus.PAID],
      [OrderStatus.PAID]: [],
      [OrderStatus.ON_WAY]: [],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    }

    const allowedTransitions = validTransitions[currentStatus] || []

    if (!allowedTransitions.includes(newStatus)) {
      console.warn(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`
      )
      return
    }

    try {
      // Call the status change handler
      await onStatusChange(activeOrderId, newStatus)
    } catch (error) {
      console.error('Status change failed:', error)
      // The error will be handled by the caller
    }
  }, [onStatusChange])

  // Handle drag over - For visual feedback during drag
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event

    if (!over) {
      return
    }

    // Additional logic can be added here for visual feedback
    // For example, highlighting the drop target
  }, [])

  return {
    sensors,
    activeOrder,
    isDragging,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.CANCELLED, OrderStatus.PAID],
    [OrderStatus.SERVED]: [OrderStatus.PAID],
    [OrderStatus.PAID]: [],
    [OrderStatus.ON_WAY]: [],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  }

  const allowedTransitions = validTransitions[currentStatus] || []
  return allowedTransitions.includes(newStatus)
}

/**
 * Get allowed target statuses for a given status
 */
export function getAllowedTargetStatuses(currentStatus: OrderStatus): OrderStatus[] {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.CANCELLED, OrderStatus.PAID],
    [OrderStatus.SERVED]: [OrderStatus.PAID],
    [OrderStatus.PAID]: [],
    [OrderStatus.ON_WAY]: [],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  }

  return validTransitions[currentStatus] || []
}
