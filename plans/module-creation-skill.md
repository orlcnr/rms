# Module Creation Skill

Bu belge, frontend'de yeni bir modül oluştururken izlenmesi gereken adımları ve yapıyı tanımlar.

## Modül Yapısı

```
/app/(main)/[module_name]/
├── page.tsx                    # Server component - ilk veri yüklemesi
└── _components/
    └── [Module]Client.tsx      # Client component - interaktif mantık

/modules/[module_name]/
├── components/                 # UI bileşenleri
│   ├── [ComponentName].tsx
│   └── index.ts               # Component exports
├── hooks/                      # Custom hooks
│   ├── use[HookName].ts
│   └── index.ts               # Hook exports
├── service.ts                  # API çağrıları
├── types.ts                    # TypeScript interfaces
├── schemas.ts                  # Zod validation schemas (opsiyonel)
└── index.ts                    # Modül exports
```

## Adım Adım Modül Oluşturma

### 1. Types Tanımlama (`types.ts`)

```typescript
// API response tipleri backend'den dönen veriye göre tanımlanmalı
// https://api.localhost/api/docs adresinden kontrol edilmeli

export interface Entity {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEntityInput {
  name: string;
  description?: string;
}

export interface UpdateEntityInput extends Partial<CreateEntityInput> {}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Component props tipleri
export interface EntityCardProps {
  entity: Entity;
  onEdit?: (entity: Entity) => void;
  onDelete?: (id: string) => void;
}
```

### 2. Service Oluşturma (`service.ts`)

```typescript
import { http } from '@/modules/shared/api/http';
import { Entity, CreateEntityInput, PaginatedResponse } from './types';

const BASE_URL = '/entities';

export const entitiesApi = {
  // Liste getir
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    return http.get<PaginatedResponse<Entity>>(BASE_URL, { params });
  },

  // Tekil getir
  getById: async (id: string) => {
    return http.get<Entity>(`${BASE_URL}/${id}`);
  },

  // Oluştur
  create: async (data: CreateEntityInput) => {
    return http.post<Entity>(BASE_URL, data);
  },

  // Güncelle
  update: async (id: string, data: Partial<CreateEntityInput>) => {
    return http.patch<Entity>(`${BASE_URL}/${id}`, data);
  },

  // Sil
  delete: async (id: string) => {
    return http.delete<void>(`${BASE_URL}/${id}`);
  },
};
```

### 3. Custom Hook Oluşturma (`hooks/use[Entity].ts`)

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';
import { entitiesApi } from '../service';
import { Entity, PaginatedResponse } from '../types';

interface UseEntitiesOptions {
  initialData?: PaginatedResponse<Entity>;
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface UseEntitiesReturn {
  // Data
  entities: Entity[];
  total: number;
  page: number;
  
  // States
  loading: boolean;
  error: Error | null;
  
  // Actions
  fetchEntities: () => Promise<void>;
  createEntity: (data: CreateEntityInput) => Promise<Entity>;
  updateEntity: (id: string, data: Partial<CreateEntityInput>) => Promise<Entity>;
  deleteEntity: (id: string) => Promise<void>;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  
  // Computed
  totalPages: number;
}

export function useEntities(options: UseEntitiesOptions = {}): UseEntitiesReturn {
  const { initialData, autoFetch = true, refreshInterval } = options;

  // States
  const [data, setData] = useState<PaginatedResponse<Entity> | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Fetch function
  const fetchEntities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await entitiesApi.getAll({ page, limit: 10, search });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // Auto fetch
  useEffect(() => {
    if (autoFetch) {
      fetchEntities();
    }
  }, [autoFetch, fetchEntities]);

  // Refresh interval
  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(fetchEntities, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchEntities]);

  // CRUD actions
  const createEntity = useCallback(async (input: CreateEntityInput) => {
    const entity = await entitiesApi.create(input);
    await fetchEntities();
    return entity;
  }, [fetchEntities]);

  const updateEntity = useCallback(async (id: string, input: Partial<CreateEntityInput>) => {
    const entity = await entitiesApi.update(id, input);
    await fetchEntities();
    return entity;
  }, [fetchEntities]);

  const deleteEntity = useCallback(async (id: string) => {
    await entitiesApi.delete(id);
    await fetchEntities();
  }, [fetchEntities]);

  // Computed values
  const totalPages = useMemo(() => {
    return data ? Math.ceil(data.total / 10) : 0;
  }, [data]);

  return {
    entities: data?.data || [],
    total: data?.total || 0,
    page,
    loading,
    error,
    fetchEntities,
    createEntity,
    updateEntity,
    deleteEntity,
    setPage,
    setSearch,
    totalPages,
  };
}
```

### 4. UI Components

#### Card Component
```typescript
// components/EntityCard.tsx
import { Entity } from '../types';
import { GlassCard } from '@/modules/shared/components/GlassCard';
import { Edit2, Trash2 } from 'lucide-react';

interface EntityCardProps {
  entity: Entity;
  onEdit?: (entity: Entity) => void;
  onDelete?: (id: string) => void;
}

export function EntityCard({ entity, onEdit, onDelete }: EntityCardProps) {
  return (
    <GlassCard className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-white">{entity.name}</h3>
          <p className="text-sm text-white/50">{entity.description}</p>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button onClick={() => onEdit(entity)} className="p-2 hover:bg-white/10 rounded-lg">
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(entity.id)} className="p-2 hover:bg-white/10 rounded-lg text-rose-400">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
```

#### List Component
```typescript
// components/EntityList.tsx
import { Entity } from '../types';
import { EntityCard } from './EntityCard';

interface EntityListProps {
  entities: Entity[];
  onEdit?: (entity: Entity) => void;
  onDelete?: (id: string) => void;
}

export function EntityList({ entities, onEdit, onDelete }: EntityListProps) {
  if (entities.length === 0) {
    return (
      <div className="text-center py-12 text-white/30">
        Henüz kayıt bulunmuyor.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {entities.map((entity) => (
        <EntityCard
          key={entity.id}
          entity={entity}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
```

### 5. Page Component

```typescript
// app/(main)/entities/page.tsx
import { getServerUser } from '@/modules/auth/server/getServerUser';
import { entitiesApi } from '@/modules/entities/service';
import { EntitiesClient } from './_components/EntitiesClient';

export default async function EntitiesPage() {
  const user = await getServerUser();
  const initialData = await entitiesApi.getAll();

  return <EntitiesClient initialData={initialData} />;
}
```

### 6. Client Component

```typescript
// app/(main)/entities/_components/EntitiesClient.tsx
'use client';

import { useEntities } from '@/modules/entities/hooks/useEntities';
import { EntityList } from '@/modules/entities/components/EntityList';
import { PaginatedResponse, Entity } from '@/modules/entities/types';

interface Props {
  initialData: PaginatedResponse<Entity>;
}

export default function EntitiesClient({ initialData }: Props) {
  const {
    entities,
    loading,
    error,
    createEntity,
    updateEntity,
    deleteEntity,
    setPage,
    setSearch,
  } = useEntities({ initialData, refreshInterval: 30000 });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-6">
      <EntityList
        entities={entities}
        onEdit={(entity) => {/* modal aç */}}
        onDelete={(id) => {/* silme onayı */}}
      />
    </div>
  );
}
```

## Best Practices

### 1. Tek Sorumluluk Prensibi
- Her component sadece bir iş yapmalı
- Hook'lar business logic'i taşımeli
- Component'ler sadece UI render etmeli

### 2. Performance Optimizasyonu
- `useMemo`: Hesaplanan değerler için
- `useCallback`: Fonksiyonlar için
- `React.memo`: Gereksiz render'ları önlemek için

### 3. Type Safety
- Backend response'a göre tip tanımla
- `any` kullanma
- Generic tipler kullan

### 4. Error Handling
- Her API çağrısında try-catch
- Loading state yönetimi
- User-friendly error mesajları

### 5. Reusability
- Generic component'ler oluştur
- Props ile konfigüre edilebilir yap
- Shared component'leri `/modules/shared/components` altına taşı

### 6. API Endpoint Kontrolü (KRİTİK)

**ÖNEMLİ:** Service dosyasında API endpoint oluşturmadan önce mutlaka:
1. Backend'de endpoint'in varlığını kontrol et
2. Doğru parametre formatını kullan
3. UUID beklenen yerlere UUID formatında değer gönder

**Yaygın Hatalar:**
```typescript
// ❌ YANLIŞ - Backend'de /orders/active endpoint'i yok
http.get<Order[]>('/orders/active');

// ✅ DOĞRU - Query parametresi ile filtrele
const activeStatuses = [OrderStatus.PENDING, OrderStatus.PREPARING].join(',');
http.get<Order[]>('/orders', { params: { status: activeStatuses } });

// ❌ YANLIŞ - UUID beklenen yere string gönder
http.get(`/tables/${selectedAreaId}`); // selectedAreaId = 'all'

// ✅ DOĞRU - UUID kontrolü yap
if (selectedAreaId !== 'all') {
  http.get(`/tables/area/${selectedAreaId}`);
}
```

**Backend Endpoint Kontrolü:**
- Swagger UI: `https://api.localhost/api/docs`
- Controller dosyalarını incele: `backend/src/modules/[module]/[module].controller.ts`
- Mevcut service dosyalarını kontrol et: `frontend/modules/[module]/service.ts`

### 7. Mevcut Service'leri Yeniden Kullan

Yeni bir service yazmadan önce mevcut service'leri kontrol et:
```typescript
// Mevcut service'leri import et
import { ordersApi } from '@/modules/orders/service';
import { tablesApi } from '@/modules/tables/service';

// Yeni service sadece özgün işlemler için
export const operationsApi = {
  // Birden fazla service'i birleştiren işlemler
  getOperationsData: async (restaurantId: string) => {
    const [areas, tables, orders] = await Promise.all([
      tablesApi.getAreas(restaurantId),
      tablesApi.getAll(restaurantId),
      ordersApi.getActiveOrders(), // Mevcut service'i kullan
    ]);
    return { areas, tables, orders };
  },
};
```
