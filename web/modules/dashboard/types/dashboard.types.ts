// ============================================
// DASHBOARD TYPES
// ============================================

import { BaseEntity } from '@/modules/shared/types';

// ============================================
// ANALYTICS TYPES (from API)
// ============================================

export interface AnalyticsSummary {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  occupancyRate: number;
  criticalStockCount: number;
  preparingOrders: number;
  readyCount: number;
  servedOrders: number;
  pendingOrders: number;
}

export interface HourlySale {
  hour: string;
  revenue: number;
  orderCount: number;
}

export interface DailySale {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface DailySalesResponse {
  data: DailySale[];
}

// ============================================
// DASHBOARD KPI TYPES
// ============================================

export interface DashboardKPI {
  id: string;
  label: string;
  value: number | string;
  type: 'currency' | 'percentage' | 'number';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

// ============================================
// ORDER TYPES (for socket events)
// ============================================

export interface DashboardOrder {
  id: string;
  orderNumber: string;
  tableId: string;
  tableName?: string;
  customerName?: string;
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  type: 'dine_in' | 'takeaway' | 'delivery';
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// KITCHEN LOAD TYPES
// ============================================

export interface KitchenLoad {
  preparingCount: number;
  readyCount: number;
  totalCapacity: number;
  loadPercentage: number;
}

// ============================================
// INVENTORY ALERT TYPES
// ============================================

export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  unit: string;
  updatedAt: string;
}

// ============================================
// TABLE TURNAROUND TYPES
// ============================================

export interface TableTurnaround {
  averageOccupancyMinutes: number;
  totalTurnarounds: number;
  currentOccupied: number;
  totalTables: number;
  occupancyPercentage: number;
}

// ============================================
// RESERVATION TYPES
// ============================================

export interface DashboardReservation {
  id: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  tableId?: string;
  tableName?: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  notes?: string;
}

// ============================================
// DASHBOARD STATE (for Zustand store)
// ============================================

export interface DashboardState {
  // KPIs
  kpis: AnalyticsSummary | null;
  
  // Orders
  recentOrders: DashboardOrder[];
  
  // Kitchen
  kitchenLoad: KitchenLoad | null;
  
  // Inventory
  criticalStocks: InventoryAlert[];
  
  // Tables
  tableTurnaround: TableTurnaround | null;
  
  // Reservations
  upcomingReservations: DashboardReservation[];
  
  // Connection
  isSocketConnected: boolean;
  
  // Loading states
  isLoading: boolean;
  isInitialLoadComplete: boolean;
}

// ============================================
// DASHBOARD ACTIONS
// ============================================

export interface DashboardActions {
  // KPIs
  setKPIs: (kpis: AnalyticsSummary) => void;
  updateKPIs: (updates: Partial<AnalyticsSummary>) => void;
  
  // Orders
  setRecentOrders: (orders: DashboardOrder[]) => void;
  addRecentOrder: (order: DashboardOrder) => void;
  updateOrder: (orderId: string, updates: Partial<DashboardOrder>) => void;
  
  // Kitchen
  setKitchenLoad: (load: KitchenLoad) => void;
  
  // Inventory
  setCriticalStocks: (stocks: InventoryAlert[]) => void;
  addCriticalStock: (stock: InventoryAlert) => void;
  
  // Tables
  setTableTurnaround: (turnaround: TableTurnaround) => void;
  
  // Reservations
  setUpcomingReservations: (reservations: DashboardReservation[]) => void;
  
  // Connection
  setConnectionStatus: (isConnected: boolean) => void;
  
  // Loading
  setLoading: (isLoading: boolean) => void;
  setInitialLoadComplete: (complete: boolean) => void;
  
  // Reset
  reset: () => void;
}

export type DashboardStore = DashboardState & DashboardActions;
