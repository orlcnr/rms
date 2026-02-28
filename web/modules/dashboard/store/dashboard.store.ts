// ============================================
// DASHBOARD STORE - Zustand
// Client-side state management for real-time dashboard updates
// ============================================

import { create } from 'zustand';
import { DashboardStore, AnalyticsSummary, DashboardOrder, KitchenLoad, InventoryAlert, TableTurnaround, DashboardReservation } from '../types/dashboard.types';

const initialState = {
  kpis: null,
  recentOrders: [],
  kitchenLoad: null,
  criticalStocks: [],
  tableTurnaround: null,
  upcomingReservations: [],
  isSocketConnected: false,
  isLoading: false,
  isInitialLoadComplete: false,
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  ...initialState,

  // KPIs
  setKPIs: (kpis: AnalyticsSummary) => set({ kpis }),

  updateKPIs: (updates: Partial<AnalyticsSummary>) =>
    set((state) => ({
      kpis: state.kpis ? { ...state.kpis, ...updates } : null,
    })),

  // Orders
  setRecentOrders: (orders: DashboardOrder[]) => set({ recentOrders: orders }),

  addRecentOrder: (order: DashboardOrder) =>
    set((state) => ({
      recentOrders: [order, ...state.recentOrders].slice(0, 20), // Keep max 20 orders
    })),

  updateOrder: (orderId: string, updates: Partial<DashboardOrder>) =>
    set((state) => ({
      recentOrders: state.recentOrders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      ),
    })),

  // Kitchen
  setKitchenLoad: (load: KitchenLoad) => set({ kitchenLoad: load }),

  // Inventory
  setCriticalStocks: (stocks: InventoryAlert[]) => set({ criticalStocks: stocks }),

  addCriticalStock: (stock: InventoryAlert) =>
    set((state) => {
      // Check if already exists
      const exists = state.criticalStocks.find((s) => s.id === stock.id);
      if (exists) {
        return {
          criticalStocks: state.criticalStocks.map((s) =>
            s.id === stock.id ? stock : s
          ),
        };
      }
      return { criticalStocks: [...state.criticalStocks, stock] };
    }),

  // Tables
  setTableTurnaround: (turnaround: TableTurnaround) =>
    set({ tableTurnaround: turnaround }),

  // Reservations
  setUpcomingReservations: (reservations: DashboardReservation[]) =>
    set({ upcomingReservations: reservations }),

  // Connection
  setConnectionStatus: (isConnected: boolean) =>
    set({ isSocketConnected: isConnected }),

  // Loading
  setLoading: (isLoading: boolean) => set({ isLoading }),

  setInitialLoadComplete: (complete: boolean) =>
    set({ isInitialLoadComplete: complete }),

  // Reset
  reset: () => set(initialState),
}));
