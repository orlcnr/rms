# Operations Modülü Refactor Planı

## Mevcut Durum Analizi

### Sorunlar
1. **OperationsClient.tsx çok büyük** - 247 satır, birden fazla sorumluluk
2. **State yönetimi karmaşık** - 10+ useState hook
3. **Business logic componentte** - Data fetching, filtering, stats calculation
4. **QR Modal logic karışık** - Modal state ve handlers componentte
5. **Type safety eksik** - Bazı yerlerde `any` kullanımı

### Mevcut Dosya Yapısı
```
/app/(main)/operations/
├── page.tsx
└── _components/
    └── OperationsClient.tsx (247 satır)

/modules/operations/
├── index.ts
├── types.ts
└── components/
    ├── AreaTabs.tsx
    ├── OperationsHeader.tsx
    └── TableCard.tsx
```

## Hedef Yapı

```
/app/(main)/operations/
├── page.tsx                          # Server component
└── _components/
    └── OperationsClient.tsx          # Sadece composition

/modules/operations/
├── index.ts                          # Exports
├── types.ts                          # Tüm tipler
├── service.ts                        # API çağrıları (YENİ)
├── components/
│   ├── index.ts                      # Component exports
│   ├── AreaTabs.tsx                  # Mevcut
│   ├── TableCard.tsx                 # Mevcut
│   ├── TableGrid.tsx                 # YENİ - Grid layout
│   ├── OperationsHeader.tsx          # Mevcut
│   ├── OperationsSearch.tsx          # YENİ - Search input
│   └── EmptyState.tsx                # YENİ - Boş durum
├── hooks/
│   ├── index.ts                      # Hook exports
│   ├── useOperationsData.ts          # YENİ - Data fetching
│   ├── useTableFilters.ts            # YENİ - Filtering logic
│   └── useQrModal.ts                 # YENİ - QR modal state
└── utils/
    └── tableHelpers.ts               # YENİ - Helper functions
```

## Detaylı Refactor Planı

### 1. Custom Hooks

#### `useOperationsData.ts` - Data Fetching Hook
```typescript
interface UseOperationsDataReturn {
  // Data
  tables: Table[];
  areas: Area[];
  activeOrders: Order[];
  
  // States
  loading: boolean;
  error: Error | null;
  
  // Actions
  refresh: () => Promise<void>;
}

export function useOperationsData(restaurantId: string | undefined): UseOperationsDataReturn {
  // Data fetching logic
  // Auto-refresh with interval
  // Error handling
}
```

#### `useTableFilters.ts` - Filtering Hook
```typescript
interface UseTableFiltersReturn {
  // Filters
  selectedAreaId: AreaFilter;
  searchQuery: string;
  
  // Actions
  setSelectedAreaId: (id: AreaFilter) => void;
  setSearchQuery: (query: string) => void;
  
  // Computed
  filteredTables: TableOperationData[];
  stats: OperationsStats;
}

export function useTableFilters(
  tables: TableOperationData[],
  areas: Area[]
): UseTableFiltersReturn {
  // Filter logic
  // Stats calculation
  // Memoization
}
```

#### `useQrModal.ts` - QR Modal Hook
```typescript
interface UseQrModalReturn {
  // State
  isOpen: boolean;
  mode: 'single' | 'bulk';
  selectedTableQr: TableQrData | undefined;
  allTableQrs: TableQrData[];
  loading: boolean;
  
  // Actions
  openSingleQr: (tableId: string) => Promise<void>;
  openBulkQr: () => Promise<void>;
  close: () => void;
}

export function useQrModal(restaurantId: string | undefined): UseQrModalReturn {
  // Modal state management
  // QR generation logic
}
```

### 2. Yeni Components

#### `TableGrid.tsx` - Grid Layout Component
```typescript
interface TableGridProps {
  tables: TableOperationData[];
  onPrintQr: (tableId: string) => void;
}

export function TableGrid({ tables, onPrintQr }: TableGridProps) {
  // Grid layout
  // Empty state handling
}
```

#### `OperationsSearch.tsx` - Search Component
```typescript
interface OperationsSearchProps {
  value: string;
  onChange: (value: string) => void;
  onPrintAllQr: () => void;
}

export function OperationsSearch({ value, onChange, onPrintAllQr }: OperationsSearchProps) {
  // Search input
  // QR button
}
```

#### `EmptyState.tsx` - Empty State Component
```typescript
interface EmptyStateProps {
  hasSearch: boolean;
}

export function EmptyState({ hasSearch }: EmptyStateProps) {
  // Empty state UI
}
```

### 3. Service Layer

#### `service.ts` - API Calls
```typescript
import { http } from '@/modules/shared/api/http';

export const operationsApi = {
  getAreas: async (restaurantId: string) => {
    return http.get<Area[]>(`/tables/areas/${restaurantId}`);
  },
  
  getTables: async (restaurantId: string) => {
    return http.get<Table[]>(`/tables/${restaurantId}`);
  },
  
  getActiveOrders: async () => {
    return http.get<Order[]>('/orders/active');
  },
  
  getTableQr: async (tableId: string, restaurantId: string, restaurantName: string) => {
    return http.get<TableQrData>(`/tables/${tableId}/qr`, { params: { restaurantId, restaurantName } });
  },
  
  getAllTableQrs: async (restaurantId: string, restaurantName: string) => {
    return http.get<TableQrData[]>('/tables/qrs', { params: { restaurantId, restaurantName } });
  },
};
```

### 4. Helper Functions

#### `tableHelpers.ts`
```typescript
// Masa durumunu hesapla
export function computeTableStatus(
  table: Table,
  activeOrders: Order[]
): TableOperationData {
  // Logic...
}

// İstatistikleri hesapla
export function calculateStats(
  tables: TableOperationData[],
  activeOrders: Order[]
): OperationsStats {
  // Logic...
}

// Rezervasyon kontrolü
export function getNextReservation(table: Table): Reservation | undefined {
  // Logic...
}
```

### 5. Types Güncelleme

#### `types.ts`
```typescript
// Mevcut tipler korunacak, yenileri eklenecek

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

export type AreaFilter = string | 'all';

// Hook return types
export interface UseOperationsDataReturn { /* ... */ }
export interface UseTableFiltersReturn { /* ... */ }
export interface UseQrModalReturn { /* ... */ }
```

## Uygulama Sırası

### Faz 1: Temel Yapı
1. `service.ts` oluştur
2. `types.ts` güncelle
3. `tableHelpers.ts` oluştur

### Faz 2: Hooks
1. `useOperationsData.ts` oluştur
2. `useTableFilters.ts` oluştur
3. `useQrModal.ts` oluştur

### Faz 3: Components
1. `TableGrid.tsx` oluştur
2. `OperationsSearch.tsx` oluştur
3. `EmptyState.tsx` oluştur

### Faz 4: Refactor
1. `OperationsClient.tsx` refactor et
2. Eski kodu temizle
3. Test et

## Performans İyileştirmeleri

### useMemo Kullanımı
```typescript
// Filtrelenmiş masalar
const filteredTables = useMemo(() => {
  return tableOperationData.filter(/* ... */);
}, [tableOperationData, selectedAreaId, searchQuery]);

// İstatistikler
const stats = useMemo(() => {
  return calculateStats(/* ... */);
}, [tableOperationData, activeOrders]);
```

### useCallback Kullanımı
```typescript
// Event handlers
const handlePrintQr = useCallback(async (tableId: string) => {
  // ...
}, [restaurantId]);

const handleAreaChange = useCallback((areaId: AreaFilter) => {
  setSelectedAreaId(areaId);
}, []);
```

### React.memo Kullanımı
```typescript
// TableCard memoization
export const TableCard = React.memo(function TableCard({ table, onPrintQr }: TableCardProps) {
  // ...
}, (prev, next) => prev.table.id === next.table.id && prev.table.computedStatus === next.table.computedStatus);
```

## Sonuç

Bu refactor ile:
- ✅ Tek sorumluluk prensibi uygulanacak
- ✅ Business logic hook'lara taşınacak
- ✅ Type safety artırılacak
- ✅ Performance optimize edilecek
- ✅ Test edilebilirlik artırılacak
- ✅ Yeniden kullanılabilirlik sağlanacak
