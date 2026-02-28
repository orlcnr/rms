'use client'

// ============================================
// KANBAN BOARD CONTAINER
// Board container - tüm sütunları barındırır
// Drag-and-drop, zoom modal ve archive toggle entegrasyonu
// ============================================

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  OrdersByStatus,
  OrderGroup,
  OrderStatus,
  Order,
} from '../types'
import { KanbanColumn } from './KanbanColumn'
import { KANBAN_COLUMNS_DINE_IN, KANBAN_COLUMNS_COMPLETED } from '../types'
import { OrderZoomModal } from './OrderZoomModal'
import { PaidOrdersSection } from './kanban/PaidOrdersSection'
import { Modal } from '@/modules/shared/components/Modal'
import { Archive } from 'lucide-react'

interface KanbanBoardProps {
  ordersByStatus: OrdersByStatus
  allOrdersByStatus?: OrdersByStatus  // Unfiltered - for drag source lookups
  onStatusChange: (orderId: string | string[], newStatus: OrderStatus) => Promise<void>
  onOrderClick: (orderGroup: OrderGroup) => void
  isLoading?: boolean
  showArchive?: boolean
  onCloseArchive?: () => void
  isConnected?: boolean
}

// Aktif sütunlar (paid ve cancelled hariç, SADECE DINE_IN)
const ACTIVE_COLUMNS = KANBAN_COLUMNS_DINE_IN

// Arşiv statusları
const ARCHIVE_STATUSES = [OrderStatus.PAID, OrderStatus.CANCELLED]

export function KanbanBoard({
  ordersByStatus,
  allOrdersByStatus,
  onStatusChange,
  onOrderClick,
  isLoading = false,
  showArchive = false,
  onCloseArchive,
  isConnected = true,
}: KanbanBoardProps) {
  // State for zoom modal
  const [zoomOrderGroup, setZoomOrderGroup] = useState<OrderGroup | null>(null)
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  // State for drag
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)

  // Mounted state to prevent hydration mismatch with dnd-kit
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Split orders into active and archive
  const activeOrdersByStatus = useMemo(() => {
    const filtered: OrdersByStatus = {} as OrdersByStatus
    Object.entries(ordersByStatus).forEach(([status, groups]) => {
      if (!ARCHIVE_STATUSES.includes(status as OrderStatus)) {
        filtered[status as keyof OrdersByStatus] = groups
      }
    })
    return filtered
  }, [ordersByStatus])

  const archiveOrdersByStatus = useMemo(() => {
    const filtered: OrdersByStatus = {} as OrdersByStatus
    Object.entries(ordersByStatus).forEach(([status, groups]) => {
      if (ARCHIVE_STATUSES.includes(status as OrderStatus)) {
        filtered[status as keyof OrdersByStatus] = groups
      }
    })
    return filtered
  }, [ordersByStatus])

  // Helper to get orders for a specific status
  const getOrdersForStatus = (
    status: OrderStatus,
    orders: OrdersByStatus
  ): OrderGroup[] => {
    return orders[status as keyof OrdersByStatus] || []
  }

  // Handle zoom click
  const handleZoomClick = (orderGroup: OrderGroup) => {
    setZoomOrderGroup(orderGroup)
    setIsZoomOpen(true)
  }

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const orderData = active.data.current as Order | undefined
    if (orderData) {
      setActiveOrder(orderData)
    }
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveOrder(null)

    if (!over) {
      return
    }

    if (!isConnected) {
      toast.error('Bağlantı bekleniyor, işlem yapılamaz')
      return
    }

    const activeGroupId = active.id as string // This is tableId
    const newStatus = over.id as OrderStatus

    // Find the order group being dragged
    let draggedGroup: OrderGroup | undefined
    const searchBase = allOrdersByStatus ?? ordersByStatus
    for (const groups of Object.values(searchBase)) {
      const found = groups.find((g: OrderGroup) => g.tableId === activeGroupId)
      if (found) {
        draggedGroup = found
        break
      }
    }

    if (!draggedGroup) return

    const currentStatus = draggedGroup.status
    if (currentStatus === newStatus) return

    try {
      const orderIds = draggedGroup.orders.map(o => o.id)
      await onStatusChange(orderIds, newStatus)
    } catch (error) {
      console.error('Status change failed:', error)
    }
  }

  // Archive orders flat list for PaidOrdersSection
  const archiveOrders = useMemo(() => {
    const orders: OrderGroup[] = []
    ARCHIVE_STATUSES.forEach((status) => {
      const groups = archiveOrdersByStatus[status]
      if (groups) {
        orders.push(...groups)
      }
    })
    return orders
  }, [archiveOrdersByStatus])

  const hasArchiveData = archiveOrders.length > 0

  if (!mounted) {
    return (
      <div className="grid grid-cols-4 gap-4 p-4 h-full">
        {ACTIVE_COLUMNS.map(column => (
          <div key={column.status} className="flex flex-col h-full bg-bg-surface rounded-lg border border-border-light p-3">
            <div className="h-8 bg-bg-muted rounded animate-pulse mb-3" />
            <div className="space-y-2">
              <div className="h-24 bg-bg-muted rounded animate-pulse" />
              <div className="h-24 bg-bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-4 gap-4 p-4 h-full overflow-y-auto">
            {ACTIVE_COLUMNS.map(column => {
              const orderGroups = getOrdersForStatus(column.status, activeOrdersByStatus)
              return (
                <KanbanColumn
                  key={column.status}
                  status={column.status}
                  label={column.label}
                  color={column.color}
                  icon={column.icon}
                  orderGroups={orderGroups}
                  onStatusChange={onStatusChange}
                  onOrderClick={onOrderClick}
                  onZoomClick={handleZoomClick}
                  isLoading={isLoading}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Archive Modal */}
      <Modal
        isOpen={showArchive}
        onClose={onCloseArchive || (() => { })}
        title="KAPANAN SİPARİŞLER"
        maxWidth="max-w-6xl"
      >
        <div className="min-h-[500px]">
          <PaidOrdersSection
            orders={archiveOrders}
            onOrderClick={onOrderClick}
            onZoomClick={handleZoomClick}
            isLoading={isLoading}
            isModalView
          />
        </div>
      </Modal>

      <DragOverlay>
        {activeOrder ? (
          <div className="bg-white rounded-lg shadow-xl border-2 border-primary-main opacity-90 p-3 w-64">
            <p className="text-sm font-medium text-text-primary">
              Sipariş taşınıyor...
            </p>
          </div>
        ) : null}
      </DragOverlay>

      <OrderZoomModal
        isOpen={isZoomOpen}
        onClose={() => {
          setIsZoomOpen(false)
          setZoomOrderGroup(null)
        }}
        orderGroup={zoomOrderGroup}
        onStatusChange={onStatusChange}
      />
    </DndContext>
  )
}
