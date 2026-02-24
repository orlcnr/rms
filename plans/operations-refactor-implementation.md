# Operations Modülü Refactor Implementasyon Notları

## Özet

Bu belge, `plans/operations-refactor-plan.md` dosyasındaki planın implementasyonu için detaylı kod örnekleri ve notlar içerir.

---

## FAZ 1: Temel Yapı

### 1.1 `service.ts` - Operations API Service

**Dosya:** `frontend/modules/operations/service.ts`

```typescript
import { http } from '@/modules/shared/api/http';
import { Area, Table, TableQrData } from '@/modules/tables/types';
import { Order } from '@/modules/orders/types';

export const operationsApi = {
  // Tüm operasyon verilerini tek seferde çek
  getOperationsData: async (restaurantId: string) => {
    const [areas, tables, activeOrders] = await Promise.all([
      http.get<Area[]>(`/tables/restaurants/${restaurantId}/areas`),
      http.get<Table[]>(`/tables/restaurants/${restaurantId}`),
      http.get<Order[]>('/orders/active'),
    ]);
    return { areas, tables, activeOrders };
  },

  // Tek masa QR
  getTableQr: async (tableId: string, restaurantId: string, restaurantName: string) => {
    const params = new URLSearchParams();
    params.append('restaurantId', restaurantId);
    params.append('restaurantName', restaurantName);
    return http.get<TableQrData>(`/tables/${tableId}/qr?${params.toString()}`);
  },

  // Tüm masalar QR
  getAllTableQrs: async (restaurantId: string, restaurantName: string) => {
    const params = new URLSearchParams();
    params.append('restaurantName', restaurantName);
    return http.get<TableQrData[]>(`/tables/restaurants/${restaurantId}/qr/all?${params.toString()}`);
  },
};
```

### 1.2 `types.ts` - Güncellenmiş Tipler

**Dosya:** `frontend/modules/operations/types.ts`

```typescript
import { Table, TableStatus, Area } from '@/modules/tables/types';
import { Order, OrderStatus } from '@/modules/orders/types';

// Mevcut tipler
export interface TableOperationData extends Table {
  activeOrder?: Order;
  totalAmount: number;
  hasReservation: boolean;
  computedStatus: TableStatus;
}

export interface OperationsStats {
  availableTables: number;
  occupiedTables: number;
  reservedTables: number;
  activeOrders: number;
  totalRevenue: number;
}

export type AreaFilter = 'all' | string;

// YENİ: Hook return types
export interface UseOperationsDataReturn {
  tables: Table[];
  areas: Area[];
  activeOrders: Order[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseTableFiltersReturn {
  selectedAreaId: AreaFilter;
  searchQuery: string;
  setSelectedAreaId: (id: AreaFilter) => void;
  setSearchQuery: (query: string) => void;
  filteredTables: TableOperationData[];
  stats: OperationsStats;
}

export interface UseQrModalReturn {
  isOpen: boolean;
  mode: 'single' | 'bulk';
  selectedTableQr: TableQrData | undefined;
  allTableQrs: TableQrData[];
  loading: boolean;
  openSingleQr: (tableId: string) => Promise<void>;
  openBulkQr: () => Promise<void>;
  close: () => void;
}
```

### 1.3 `utils/tableHelpers.ts` - Helper Fonksiyonlar

**Dosya:** `frontend/modules/operations/utils/tableHelpers.ts`

```typescript
import { Table, TableStatus } from '@/modules/tables/types';
import { Order, OrderStatus } from '@/modules/orders/types';
import { TableOperationData, OperationsStats } from '../types';

/**
 * Masa için hesaplanan durum bilgisini oluşturur
 */
export function computeTableStatus(
  table: Table,
  activeOrders: Order[]
): TableOperationData {
  const activeOrder = activeOrders.find(
    (o) =>
      o.tableId === table.id &&
      o.status !== OrderStatus.PAID &&
      o.status !== OrderStatus.CANCELLED
  );

  const totalAmount = activeOrder?.totalAmount || 0;
  const isOccupied = table.status === TableStatus.OCCUPIED || totalAmount > 0;

  const nextReservation = table.reservations?.find(
    (r) =>
      ['pending', 'confirmed'].includes(r.status) &&
      new Date(r.reservation_time) > new Date()
  );
  const hasReservation = !!nextReservation;
  const isReserved = table.status === TableStatus.RESERVED || (hasReservation && !isOccupied);

  const computedStatus = isOccupied
    ? TableStatus.OCCUPIED
    : isReserved
      ? TableStatus.RESERVED
      : TableStatus.AVAILABLE;

  return {
    ...table,
    activeOrder,
    totalAmount,
    hasReservation,
    computedStatus,
  };
}

/**
 * Tüm masalar için hesaplanan verileri oluşturur
 */
export function computeAllTableData(
  tables: Table[],
  activeOrders: Order[]
): TableOperationData[] {
  return tables.map((table) => computeTableStatus(table, activeOrders));
}

/**
 * Operasyon istatistiklerini hesaplar
 */
export function calculateStats(
  tableData: TableOperationData[],
  activeOrders: Order[]
): OperationsStats {
  return {
    availableTables: tableData.filter((t) => t.computedStatus === TableStatus.AVAILABLE).length,
    occupiedTables: tableData.filter((t) => t.computedStatus === TableStatus.OCCUPIED).length,
    reservedTables: tableData.filter((t) => t.computedStatus === TableStatus.RESERVED).length,
    activeOrders: activeOrders.filter(
      (o) => o.status !== OrderStatus.PAID && o.status !== OrderStatus.CANCELLED
    ).length,
    totalRevenue: activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
  };
}

/**
 * Masaları area ve search'e göre filtreler
 */
export function filterTables(
  tables: TableOperationData[],
  selectedAreaId: string | 'all',
  searchQuery: string
): TableOperationData[] {
  return tables.filter((table) => {
    const matchesArea = selectedAreaId === 'all' || table.area_id === selectedAreaId;
    const matchesSearch = table.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArea && matchesSearch;
  });
}
```

---

## FAZ 2: Custom Hooks

### 2.1 `useOperationsData.ts` - Data Fetching Hook

**Dosya:** `frontend/modules/operations/hooks/useOperationsData.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { operationsApi } from '../service';
import { UseOperationsDataReturn } from '../types';
import { Table, Area } from '@/modules/tables/types';
import { Order } from '@/modules/orders/types';

export function useOperationsData(
  restaurantId: string | undefined,
  isAuthLoading: boolean
): UseOperationsDataReturn {
  const [tables, setTables] = useState<Table[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!restaurantId) return;

    try {
      setError(null);
      const data = await operationsApi.getOperationsData(restaurantId);
      setAreas(data.areas);
      setTables(data.tables);
      setActiveOrders(data.activeOrders);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Veri çekme hatası'));
      console.error('Veri çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!isAuthLoading && restaurantId) {
      fetchData();
      // 10 saniyede bir otomatik yenile
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [restaurantId, isAuthLoading, fetchData]);

  return {
    tables,
    areas,
    activeOrders,
    loading,
    error,
    refresh: fetchData,
  };
}
```

### 2.2 `useTableFilters.ts` - Filtering Hook

**Dosya:** `frontend/modules/operations/hooks/useTableFilters.ts`

```typescript
import { useState, useMemo, useCallback } from 'react';
import { Table, Area } from '@/modules/tables/types';
import { Order } from '@/modules/orders/types';
import { UseTableFiltersReturn, AreaFilter } from '../types';
import { computeAllTableData, calculateStats, filterTables } from '../utils/tableHelpers';

export function useTableFilters(
  tables: Table[],
  activeOrders: Order[],
  areas: Area[]
): UseTableFiltersReturn {
  const [selectedAreaId, setSelectedAreaId] = useState<AreaFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Hesaplanan masa verileri
  const tableOperationData = useMemo(
    () => computeAllTableData(tables, activeOrders),
    [tables, activeOrders]
  );

  // Filtrelenmiş masalar
  const filteredTables = useMemo(
    () => filterTables(tableOperationData, selectedAreaId, searchQuery),
    [tableOperationData, selectedAreaId, searchQuery]
  );

  // İstatistikler
  const stats = useMemo(
    () => calculateStats(tableOperationData, activeOrders),
    [tableOperationData, activeOrders]
  );

  // Area değiştirme handler
  const handleAreaChange = useCallback((id: AreaFilter) => {
    setSelectedAreaId(id);
  }, []);

  // Search değiştirme handler
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    selectedAreaId,
    searchQuery,
    setSelectedAreaId: handleAreaChange,
    setSearchQuery: handleSearchChange,
    filteredTables,
    stats,
  };
}
```

### 2.3 `useQrModal.ts` - QR Modal Hook

**Dosya:** `frontend/modules/operations/hooks/useQrModal.ts`

```typescript
import { useState, useCallback } from 'react';
import { operationsApi } from '../service';
import { UseQrModalReturn } from '../types';
import { TableQrData } from '@/modules/tables/types';

export function useQrModal(
  restaurantId: string | undefined,
  restaurantName: string
): UseQrModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [selectedTableQr, setSelectedTableQr] = useState<TableQrData | undefined>();
  const [allTableQrs, setAllTableQrs] = useState<TableQrData[]>([]);
  const [loading, setLoading] = useState(false);

  const openSingleQr = useCallback(
    async (tableId: string) => {
      if (!restaurantId) return;
      setLoading(true);
      try {
        const qrData = await operationsApi.getTableQr(tableId, restaurantId, restaurantName);
        setSelectedTableQr(qrData);
        setMode('single');
        setIsOpen(true);
      } catch (error) {
        console.error('QR generation error:', error);
        alert('QR kod oluşturma hatası');
      } finally {
        setLoading(false);
      }
    },
    [restaurantId, restaurantName]
  );

  const openBulkQr = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const qrDataList = await operationsApi.getAllTableQrs(restaurantId, restaurantName);
      setAllTableQrs(qrDataList);
      setMode('bulk');
      setIsOpen(true);
    } catch (error) {
      console.error('Bulk QR generation error:', error);
      alert('QR kodları oluşturma hatası');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, restaurantName]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedTableQr(undefined);
    setAllTableQrs([]);
  }, []);

  return {
    isOpen,
    mode,
    selectedTableQr,
    allTableQrs,
    loading,
    openSingleQr,
    openBulkQr,
    close,
  };
}
```

---

## FAZ 3: Yeni Componentler

### 3.1 `TableGrid.tsx` - Grid Layout

**Dosya:** `frontend/modules/operations/components/TableGrid.tsx`

```typescript
import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { TableOperationData } from '../types';
import { TableCard } from './TableCard';
import { EmptyState } from './EmptyState';

interface TableGridProps {
  tables: TableOperationData[];
  searchQuery: string;
  onPrintQr: (tableId: string) => void;
}

export function TableGrid({ tables, searchQuery, onPrintQr }: TableGridProps) {
  if (tables.length === 0) {
    return <EmptyState hasSearch={!!searchQuery} />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {tables.map((table) => (
        <TableCard key={table.id} table={table} onPrintQr={onPrintQr} />
      ))}
    </div>
  );
}
```

### 3.2 `OperationsSearch.tsx` - Search Component

**Dosya:** `frontend/modules/operations/components/OperationsSearch.tsx`

```typescript
import React from 'react';
import { Search, QrCode, Loader2 } from 'lucide-react';

interface OperationsSearchProps {
  value: string;
  onChange: (value: string) => void;
  onPrintAllQr: () => void;
  qrLoading: boolean;
}

export function OperationsSearch({
  value,
  onChange,
  onPrintAllQr,
  qrLoading,
}: OperationsSearchProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
        <input
          type="text"
          placeholder="Masa ara..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 w-40 md:w-64"
        />
      </div>
      <button
        onClick={onPrintAllQr}
        disabled={qrLoading}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-all text-sm font-bold disabled:opacity-50"
      >
        {qrLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <QrCode className="w-4 h-4" />
        )}
        <span className="hidden md:inline">Tüm QR</span>
      </button>
    </div>
  );
}
```

### 3.3 `EmptyState.tsx` - Boş Durum

**Dosya:** `frontend/modules/operations/components/EmptyState.tsx`

```typescript
import React from 'react';
import { LayoutGrid } from 'lucide-react';

interface EmptyStateProps {
  hasSearch: boolean;
}

export function EmptyState({ hasSearch }: EmptyStateProps) {
  return (
    <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[48px] bg-white/[0.02]">
      <LayoutGrid className="w-12 h-12 text-white/5 mx-auto mb-4" />
      <p className="text-white/10 font-black uppercase tracking-[0.4em] text-sm italic">
        {hasSearch ? 'Arama sonucu bulunamadı' : 'Henüz masa eklenmemiş'}
      </p>
    </div>
  );
}
```

---

## FAZ 4: Refactored OperationsClient.tsx

**Dosya:** `frontend/app/(main)/operations/_components/OperationsClient.tsx`

```typescript
'use client';

import React from 'react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { PageHeader } from '@/modules/shared/components/PageHeader';
import { AreaTabs } from '@/modules/operations/components/AreaTabs';
import { TableGrid } from '@/modules/operations/components/TableGrid';
import { OperationsSearch } from '@/modules/operations/components/OperationsSearch';
import { QrPrintModal } from '@/modules/tables/components/QrPrintModal';
import { useOperationsData } from '@/modules/operations/hooks/useOperationsData';
import { useTableFilters } from '@/modules/operations/hooks/useTableFilters';
import { useQrModal } from '@/modules/operations/hooks/useQrModal';
import { Activity, LayoutGrid, Loader2 } from 'lucide-react';

export default function OperationsClient() {
  const { user, isLoading: isAuthLoading } = useAuth();

  // Data fetching hook
  const { tables, areas, activeOrders, loading, error } = useOperationsData(
    user?.restaurantId,
    isAuthLoading
  );

  // Filtering hook
  const {
    selectedAreaId,
    searchQuery,
    setSelectedAreaId,
    setSearchQuery,
    filteredTables,
    stats,
  } = useTableFilters(tables, activeOrders, areas);

  // QR Modal hook
  const {
    isOpen: qrModalOpen,
    mode: qrModalMode,
    selectedTableQr,
    allTableQrs,
    loading: qrLoading,
    openSingleQr,
    openBulkQr,
    close: closeQrModal,
  } = useQrModal(user?.restaurantId, 'Restaurant');

  // Loading state
  if (isAuthLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center animate-in fade-in">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">
            Veriler Yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  // No restaurant state
  if (!user?.restaurantId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-white/40 gap-4">
        <p className="font-medium">Restoran bilgisi bulunamadı. Lütfen tekrar giriş yapın.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-[1800px] mx-auto animate-in fade-in duration-700">
      <PageHeader
        title="Operasyonlar"
        subtitle="Masa ve Sipariş Yönetimi"
        icon={Activity}
        iconClassName="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
        rightContent={
          <OperationsSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onPrintAllQr={openBulkQr}
            qrLoading={qrLoading}
          />
        }
      />

      {/* Area Tabs & Table Grid */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase italic">
            <div className="text-indigo-500">
              <LayoutGrid size={24} />
            </div>
            MASALAR
          </h2>

          <AreaTabs
            areas={areas}
            selectedAreaId={selectedAreaId}
            onAreaChange={setSelectedAreaId}
          />
        </div>

        <TableGrid
          tables={filteredTables}
          searchQuery={searchQuery}
          onPrintQr={openSingleQr}
        />
      </div>

      {/* QR Print Modal */}
      <QrPrintModal
        isOpen={qrModalOpen}
        onClose={closeQrModal}
        mode={qrModalMode}
        singleQrData={selectedTableQr}
        bulkQrData={allTableQrs}
      />
    </div>
  );
}
```

---

## Export Dosyaları

### `hooks/index.ts`

```typescript
export { useOperationsData } from './useOperationsData';
export { useTableFilters } from './useTableFilters';
export { useQrModal } from './useQrModal';
```

### `components/index.ts`

```typescript
export { AreaTabs } from './AreaTabs';
export { OperationsHeader } from './OperationsHeader';
export { TableCard } from './TableCard';
export { TableGrid } from './TableGrid';
export { OperationsSearch } from './OperationsSearch';
export { EmptyState } from './EmptyState';
```

### `index.ts` (güncellenmiş)

```typescript
// Types
export * from './types';

// Service
export { operationsApi } from './service';

// Hooks
export * from './hooks';

// Components
export * from './components';
```

---

## Dosya Yapısı (Sonuç)

```
/modules/operations/
├── index.ts                          # Ana exports
├── types.ts                          # Tüm tipler
├── service.ts                        # API çağrıları
├── components/
│   ├── index.ts                      # Component exports
│   ├── AreaTabs.tsx                  # Mevcut
│   ├── TableCard.tsx                 # Mevcut
│   ├── TableGrid.tsx                 # YENİ
│   ├── OperationsHeader.tsx          # Mevcut
│   ├── OperationsSearch.tsx          # YENİ
│   └── EmptyState.tsx                # YENİ
├── hooks/
│   ├── index.ts                      # Hook exports
│   ├── useOperationsData.ts          # YENİ
│   ├── useTableFilters.ts            # YENİ
│   └── useQrModal.ts                 # YENİ
└── utils/
    └── tableHelpers.ts               # YENİ
```

---

## Performans Notları

1. **useMemo**: `filteredTables`, `stats`, `tableOperationData` için kullanıldı
2. **useCallback**: Event handler'lar için kullanıldı
3. **React.memo**: `TableCard` component'i için önerilir (opsiyonel)

## Test Önerileri

1. Hook'ların bağımsız test edilmesi
2. Helper fonksiyonların unit test'i
3. Component'lerin render test'i
