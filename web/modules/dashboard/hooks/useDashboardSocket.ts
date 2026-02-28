// ============================================
// USE DASHBOARD SOCKET HOOK
// Socket connection management for dashboard real-time updates
// ============================================

import { useEffect, useCallback } from 'react';
import { useSocketStore } from '@/modules/shared/api/socket';
import { useDashboardStore } from '../store/dashboard.store';
import { DashboardOrder, KitchenLoad, InventoryAlert, TableTurnaround } from '../types/dashboard.types';
import { toast } from 'sonner';

interface UseDashboardSocketProps {
  restaurantId: string;
}

export function useDashboardSocket({ restaurantId }: UseDashboardSocketProps) {
  const socketStore = useSocketStore();
  const store = useDashboardStore();

  // Connect to socket
  const connect = useCallback(() => {
    if (restaurantId && !socketStore.socket) {
      socketStore.connect(restaurantId);
    }
  }, [restaurantId, socketStore]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    socketStore.disconnect();
  }, [socketStore]);

  // Handle new order event
  const handleNewOrder = useCallback(
    (data: { order: DashboardOrder; totalAmount?: number }) => {
      if (data.order) {
        // Add to recent orders
        store.addRecentOrder(data.order);

        // Update KPIs - increment order count and revenue
        if (data.totalAmount) {
          store.updateKPIs({
            orderCount: (store.kpis?.orderCount || 0) + 1,
            totalRevenue: (store.kpis?.totalRevenue || 0) + data.totalAmount,
            preparingOrders: (store.kpis?.preparingOrders || 0) + 1,
          });
        }

        toast.info(`Yeni sipariş: ${data.order.orderNumber}`, {
          description: `${data.order.tableName || 'Masa'} - ₺${data.totalAmount?.toFixed(2)}`,
          duration: 3000,
        });
      }
    },
    [store]
  );

  // Handle order status update event
  const handleOrderStatusUpdate = useCallback(
    (data: { orderId: string; status: string; previousStatus?: string }) => {
      store.updateOrder(data.orderId, {
        status: data.status as DashboardOrder['status'],
      });

      // Update KPIs based on status change
      const kpis = store.kpis;
      if (kpis) {
        const updates: Record<string, number> = {};

        // Moving from preparing to ready
        if (data.previousStatus === 'preparing' && data.status === 'ready') {
          updates.preparingOrders = Math.max(0, (kpis.preparingOrders || 1) - 1);
          updates.readyCount = (kpis.readyCount || 0) + 1;
        }
        // Moving from ready to served
        if (data.status === 'served') {
          updates.readyCount = Math.max(0, (kpis.readyCount || 1) - 1);
          updates.servedOrders = (kpis.servedOrders || 0) + 1;
        }
        // Moving from served to paid
        if (data.status === 'paid') {
          updates.servedOrders = Math.max(0, (kpis.servedOrders || 1) - 1);
        }

        if (Object.keys(updates).length > 0) {
          store.updateKPIs(updates);
        }
      }
    },
    [store]
  );

  // Handle order updated event
  const handleOrderUpdated = useCallback(
    (data: { orderId: string; totalAmount?: number }) => {
      if (data.totalAmount !== undefined) {
        store.updateOrder(data.orderId, { totalAmount: data.totalAmount });
      }
    },
    [store]
  );

  // Handle kitchen load event
  const handleKitchenLoad = useCallback(
    (data: KitchenLoad) => {
      store.setKitchenLoad(data);
    },
    [store]
  );

  // Handle inventory low event
  const handleInventoryLow = useCallback(
    (data: InventoryAlert) => {
      store.addCriticalStock(data);

      toast.warning(`Kritik stok: ${data.productName}`, {
        description: `Mevcut: ${data.currentStock} ${data.unit} (Min: ${data.minStock})`,
        duration: 5000,
      });
    },
    [store]
  );

  // Handle table turnaround event
  const handleTableTurnaround = useCallback(
    (data: TableTurnaround) => {
      store.setTableTurnaround(data);
    },
    [store]
  );

  // Handle reservation update
  const handleReservationUpdate = useCallback(
    (data: { reservation: any; action: 'add' | 'update' | 'remove' }) => {
      // Could update reservations here if needed
      console.log('[DashboardSocket] Reservation update:', data);
    },
    []
  );

  // Setup socket event listeners
  useEffect(() => {
    if (!socketStore.socket) {
      return;
    }

    // Register event listeners
    socketStore.on('new_order', (data: unknown) => handleNewOrder(data as { order: DashboardOrder; totalAmount?: number }));
    socketStore.on('order_status_updated', (data: unknown) => handleOrderStatusUpdate(data as { orderId: string; status: string; previousStatus?: string }));
    socketStore.on('order:updated', (data: unknown) => handleOrderUpdated(data as { orderId: string; totalAmount?: number }));
    socketStore.on('kitchen:load', (data: unknown) => handleKitchenLoad(data as KitchenLoad));
    socketStore.on('inventory:low', (data: unknown) => handleInventoryLow(data as InventoryAlert));
    socketStore.on('table:turnaround', (data: unknown) => handleTableTurnaround(data as TableTurnaround));
    socketStore.on('reservation_update', (data: unknown) => handleReservationUpdate(data as { reservation: unknown; action: 'add' | 'update' | 'remove' }));

    // Handle connect/disconnect for UI status
    socketStore.on('connect', () => {
      store.setConnectionStatus(true);
      toast.success('Canlı veri bağlantısı aktif', {
        duration: 2000,
      });
    });

    socketStore.on('disconnect', () => {
      store.setConnectionStatus(false);
      toast.error('Bağlantı kesildi', {
        description: 'Tekrar bağlanıyor...',
        duration: 3000,
      });
    });

    // Cleanup on unmount
    return () => {
      socketStore.off('new_order');
      socketStore.off('order_status_updated');
      socketStore.off('order:updated');
      socketStore.off('kitchen:load');
      socketStore.off('inventory:low');
      socketStore.off('table:turnaround');
      socketStore.off('reservation_update');
      socketStore.off('connect');
      socketStore.off('disconnect');
    };
  }, [
    socketStore.socket,
    handleNewOrder,
    handleOrderStatusUpdate,
    handleOrderUpdated,
    handleKitchenLoad,
    handleInventoryLow,
    handleTableTurnaround,
    handleReservationUpdate,
    store,
    socketStore,
  ]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: socketStore.isConnected,
    connect,
    disconnect,
  };
}
