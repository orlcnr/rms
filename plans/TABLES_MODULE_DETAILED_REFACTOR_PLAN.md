# Tables Modülü Detaylı Refactoring Planı (DRY Uyumlu)

> Bu plan, Tables modülünü DRY kurallarına uygun hale getirmek ve component'leri parçalara ayırmak için hazırlanmıştır.

---

## Hedef Yapı

```
web/modules/tables/
├── types.ts                    # Tüm statik veriler + TypeScript tipler (ZORUNLU)
├── enums/
│   └── table-status.enum.ts    # Status enum + Style Map (DRY)
├── services/
│   └── tables.service.ts       # API çağrıları
├── utils/
│   └── table-url.ts           # QR URL helper (YENİ - DRY)
├── components/
│   ├── TablesClient.tsx        # Ana koordinasyon (MAX 150 satır)
│   ├── AreaTabs.tsx           # Alan sekmeleri
│   ├── TableGrid.tsx           # Masa ızgarası görünümü
│   ├── TableCard.tsx           # Masa kartı (DRY)
│   ├── TableForm.tsx           # Masa formu (DRY)
│   ├── AreaForm.tsx           # Alan formu (DRY)
│   ├── QrCodeModal.tsx        # QR kod modalı (YENİ)
│   ├── StatusBadge.tsx        # Status badge (YENİ - DRY)
│   ├── TableSkeleton.tsx       # Skeleton loader (YENİ)
│   └── TableActions.tsx       # Masa actions (YENİ - DRY)
└── hooks/
    ├── useTables.ts           # Masa verisi hook (YENİ)
    └── useAreas.ts            # Alan verisi hook (YENİ)
```

---

## 1. ADIM: types.ts + enums/ Oluştur

### 1.1 Enums Klasörü

**Dosya:** `web/modules/tables/enums/table-status.enum.ts`

```typescript
import { TableStatus } from '../types';

// ============================================
// DRY: Status Style Map (Type Safety + Tailwind)
// ============================================
// ÖNEMLİ: Dinamik sınıf kullanma (örn: bg-${color}-bg)
// Tailwind safing mekanizması nedeniyle runtime'da çalışmayabilir
// Tam string mapping kullan!

export const TABLE_STATUS_STYLES = {
    [TableStatus.AVAILABLE]: 'bg-success-subtle text-success-main border-success-main/20',
    [TableStatus.OCCUPIED]: 'bg-danger-subtle text-danger-main border-danger-main/20',
    [TableStatus.RESERVED]: 'bg-warning-subtle text-warning-main border-warning-main/20',
    [TableStatus.OUT_OF_SERVICE]: 'bg-bg-muted text-text-muted border-border-light',
} as const;

export const TABLE_STATUS_CONFIG = {
    [TableStatus.AVAILABLE]: {
        label: 'BOŞ',
        style: TABLE_STATUS_STYLES[TableStatus.AVAILABLE],
    },
    [TableStatus.OCCUPIED]: {
        label: 'DOLU', 
        style: TABLE_STATUS_STYLES[TableStatus.OCCUPIED],
    },
    [TableStatus.RESERVED]: {
        label: 'REZERVE',
        style: TABLE_STATUS_STYLES[TableStatus.RESERVED],
    },
    [TableStatus.OUT_OF_SERVICE]: {
        label: 'KAPALI',
        style: TABLE_STATUS_STYLES[TableStatus.OUT_OF_SERVICE],
    },
} as const;

export type TableStatusStyle = typeof TABLE_STATUS_STYLES[keyof typeof TABLE_STATUS_STYLES];

export const getStatusConfig = (status: TableStatus) => TABLE_STATUS_CONFIG[status];
export const getStatusStyle = (status: TableStatus) => TABLE_STATUS_STYLES[status];
```

### 1.2 types.ts Güncelle

**Dosya:** `web/modules/tables/types.ts`

```typescript
import { BaseEntity } from '@/modules/shared/types'

// Mevcut enum ve interface'ler (kalacak)

// DRY: Form sabitleri - component içinde DEĞIL, types'da
export const TABLE_FORM_DEFAULTS = {
    capacity: 4,
    status: TableStatus.AVAILABLE,
} as const;

export const AREA_FORM_DEFAULTS = {
    name: '',
} as const;

// DRY: Select options - component içinde DEĞIL, types'da
export const CAPACITY_OPTIONS = Array.from({ length: 20 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `${i + 1} Kişi`,
}));

export const AREA_TABS_ALL = '__all__';
```

---

## 2. ADIM: QR URL Helper (YENİ - DRY)

**Dosya:** `web/modules/tables/utils/table-url.ts`

```typescript
// ============================================
// DRY: Merkezi QR URL Oluşturma
// ============================================
// Bu mantığı birden fazla yerde kullanabiliriz:
// - QrCodeModal
// - Toplu PDF indirme
// - QR kod batch oluşturma

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menun.com';

export const getTableOrderUrl = (
    restaurantSlug: string, 
    tableId: string,
    tableName?: string
): string => {
    const url = new URL(`/r/${restaurantSlug}`, APP_URL);
    url.searchParams.set('table', tableId);
    if (tableName) {
        url.searchParams.set('name', tableName);
    }
    return url.toString();
};

export const getTableQrData = (
    restaurantSlug: string,
    tableId: string,
    tableName: string,
    restaurantName?: string
) => {
    return {
        url: getTableOrderUrl(restaurantSlug, tableId, tableName),
        tableId,
        tableName,
        restaurantSlug,
        restaurantName,
    };
};
```

---

## 3. ADIM: Skeleton Loader (YENİ)

**Dosya:** `web/modules/tables/components/TableSkeleton.tsx`

```typescript
'use client'

// ============================================
// DRY: Layout Shift Önleme
// ============================================
// Masalar yüklenirken ekranın "zıplamasını" engellemek için
// Placeholder göster

interface TableSkeletonProps {
    count?: number
}

export function TableSkeleton({ count = 8 }: TableSkeletonProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div 
                    key={i} 
                    className="h-32 bg-bg-muted animate-pulse rounded-sm border border-border-light"
                />
            ))}
        </div>
    )
}

export function AreaTabsSkeleton() {
    return (
        <div className="flex gap-2 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div 
                    key={i}
                    className="h-10 w-24 bg-bg-muted animate-pulse rounded"
                />
            ))}
        </div>
    )
}
```

---

## 4. ADIM: StatusBadge Component (DRY + Token)

**Dosya:** `web/modules/tables/components/StatusBadge.tsx`

```typescript
'use client'

import { TableStatus, getStatusConfig } from '../enums/table-status.enum'

interface StatusBadgeProps {
    status: TableStatus
    size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const config = getStatusConfig(status)
    
    const sizeClasses = {
        sm: 'text-[8px] px-2 py-0.5',
        md: 'text-[9px] px-3 py-1', 
        lg: 'text-xs px-4 py-1.5',
    }
    
    return (
        <span className={cn(
            'inline-flex items-center rounded-full font-black tracking-wider uppercase',
            config.style,  // Tam string olarak uygula
            sizeClasses[size]
        )}>
            {config.label}
        </span>
    )
}
```

---

## 5. ADIM: TableCard Refactor (DRY + Token)

**Dosya:** `web/modules/tables/components/TableCard.tsx`

```typescript
'use client'

import { Table } from '../types'
import { Users } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { TableActions } from './TableActions'

interface TableCardProps {
    table: Table
    onEdit: (table: Table) => void
    onDelete: (id: string) => void  
    onShowQr: (table: Table) => void
}

// MAX 50 satır!
export function TableCard({ table, onEdit, onDelete, onShowQr }: TableCardProps) {
    return (
        <div className="bg-bg-surface border border-border-light rounded-sm p-4 hover:border-primary-main transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <StatusBadge status={table.status} />
                <TableActions 
                    onEdit={() => onEdit(table)} 
                    onDelete={() => onDelete(table.id)}
                    onShowQr={() => onShowQr(table)}
                />
            </div>
            
            {/* Content */}
            <div>
                <h3 className="text-text-primary font-bold">{table.name}</h3>
                <div className="flex items-center gap-1 text-text-muted text-sm mt-1">
                    <Users size={14} />
                    <span>{table.capacity} kişi</span>
                </div>
            </div>
        </div>
    )
}
```

---

## 6. ADIM: TableActions Component (DRY)

**Dosya:** `web/modules/tables/components/TableActions.tsx`

```typescript
'use client'

import { MoreVertical, QrCode } from 'lucide-react'

interface TableActionsProps {
    onEdit: () => void
    onDelete: () => void
    onShowQr: () => void
}

export function TableActions({ onEdit, onDelete, onShowQr }: TableActionsProps) {
    return (
        <div className="flex items-center gap-1">
            <button 
                onClick={onShowQr} 
                className="p-2 hover:bg-bg-muted rounded text-text-muted hover:text-text-primary"
                title="QR Kod"
            >
                <QrCode size={16} />
            </button>
            <button 
                onClick={onEdit} 
                className="p-2 hover:bg-bg-muted rounded text-text-muted hover:text-text-primary"
                title="Düzenle"
            >
                <MoreVertical size={16} />
            </button>
        </div>
    )
}
```

---

## 7. ADIM: TableForm Refactor (FormInput Kullan)

**Dosya:** `web/modules/tables/components/TableForm.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Table, CreateTableInput, TABLE_FORM_DEFAULTS, CAPACITY_OPTIONS } from '../types'
import { FormInput } from '@/modules/shared/components/FormInput'
import { FormSection } from '@/modules/shared/components/FormSection'
import { Button } from '@/modules/shared/components/Button'

interface TableFormProps {
    initialData?: Table
    onSubmit: (data: Partial<CreateTableInput>) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

export function TableForm({ initialData, onSubmit, onCancel, isLoading }: TableFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        capacity: initialData?.capacity?.toString() || TABLE_FORM_DEFAULTS.capacity.toString(),
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit({
            name: formData.name,
            capacity: Number(formData.capacity),
        })
    }

    return (
        <form onSubmit={handleSubmit}>
            <FormSection title="MASA BİLGİLERİ" variant="primary">
                <div className="space-y-4">
                    <FormInput
                        id="tableName"
                        name="name"
                        label="MASA ADI"
                        value={formData.name}
                        onChange={(v) => setFormData({...formData, name: v})}
                        placeholder="ÖRN: MASA 1, TERAS 1"
                        required
                    />
                    
                    <FormInput
                        id="tableCapacity"
                        name="capacity"
                        label="KAPASİTE"
                        value={formData.capacity}
                        onChange={(v) => setFormData({...formData, capacity: v})}
                        options={CAPACITY_OPTIONS}
                        isSelect
                        required
                    />
                </div>
            </FormSection>
            
            <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={onCancel}>İPTAL</Button>
                <Button type="submit" isLoading={isLoading}>
                    {initialData ? 'GÜNCELLE' : 'EKLE'}
                </Button>
            </div>
        </form>
    )
}
```

---

## 8. ADIM: AreaForm Refactor (FormInput Kullan)

**Dosya:** `web/modules/tables/components/AreaForm.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Area, CreateAreaInput, AREA_FORM_DEFAULTS } from '../types'
import { FormInput } from '@/modules/shared/components/FormInput'
import { FormSection } from '@/modules/shared/components/FormSection'
import { Button } from '@/modules/shared/components/Button'

interface AreaFormProps {
    initialData?: Area
    onSubmit: (data: Partial<CreateAreaInput>) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

export function AreaForm({ initialData, onSubmit, onCancel, isLoading }: AreaFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || AREA_FORM_DEFAULTS.name,
    })

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData) }}>
            <FormSection title="ALAN BİLGİLERİ" variant="primary">
                <FormInput
                    id="areaName"
                    name="name"
                    label="SALON / ALAN ADI"
                    value={formData.name}
                    onChange={(v) => setFormData({...formData, name: v})}
                    placeholder="ÖRN: TERAS, BAHÇE, SALON 1"
                    required
                />
            </FormSection>
            
            <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={onCancel}>İPTAL</Button>
                <Button type="submit" isLoading={isLoading}>
                    {initialData ? 'GÜNCELLE' : 'EKLE'}
                </Button>
            </div>
        </form>
    )
}
```

---

## 9. ADIM: TablesClient Parçalama + useMemo

**Ana İlke:** Her component MAX 150-200 satır

### 9.1 TablesClient (Koordinasyon + useMemo)

```typescript
// Sadece layout ve state koordine eder
// MAX 150 satır!
// Filtreleme mantığı useMemo ile

export function TablesClient({ restaurantId, initialAreas, initialTables }: Props) {
    // State
    const [areas, setAreas] = useState(initialAreas)
    const [tables, setTables] = useState(initialTables)
    const [activeAreaId, setActiveAreaId] = useState<string | null>(null)
    
    // ============================================
    // DRY: useMemo ile Filtreleme
    // ============================================
    const filteredTables = useMemo(() => {
        if (activeAreaId === AREA_TABS_ALL || !activeAreaId) {
            return tables;
        }
        return tables.filter(t => t.area_id === activeAreaId);
    }, [tables, activeAreaId]);

    // Handler'ları alt component'lere delegasyon yap
    // Veri yükleme, modal yönetimi
    
    return (
        <div>
            {/* Loading State */}
            {isLoading ? (
                <>
                    <AreaTabsSkeleton />
                    <TableSkeleton />
                </>
            ) : (
                <>
                    <AreaTabs 
                        areas={areas} 
                        activeId={activeAreaId} 
                        onChange={setActiveAreaId} 
                    />
                    <TableGrid 
                        tables={filteredTables} 
                        onEdit={handleEditTable} 
                        onDelete={handleDeleteTable}
                        onShowQr={handleShowQr}
                    />
                </>
            )}
            {/* Modals */}
        </div>
    )
}
```

### 9.2 AreaTabs (Alt Component)

- Sadece tab'ları render eder
- MAX 80 satır

### 9.3 TableGrid (Alt Component)

- Masa listesini render eder
- MAX 100 satır

### 9.4 QrCodeModal (Yeni Component)

- `table-url.ts` utilities kullanır
- MAX 80 satır

---

## 10. ADIM: Custom Hooks (Opsiyonel)

**Dosya:** `web/modules/tables/hooks/useTables.ts`

```typescript
'use client'

import { useState, useCallback } from 'react'
import { Table, tablesApi } from '../services/tables.service'

export function useTables(restaurantId: string) {
    const [tables, setTables] = useState<Table[]>([])
    const [isLoading, setIsLoading] = useState(false)
    
    const refresh = useCallback(async () => {
        setIsLoading(true)
        const data = await tablesApi.getTables(restaurantId)
        setTables(data)
        setIsLoading(false)
    }, [restaurantId])
    
    return { tables, isLoading, refresh }
}
```

---

## Özet: Yapılacaklar

| # | Dosya | İşlem | Satır Hedefi |
|---|-------|-------|--------------|
| 1 | `enums/table-status.enum.ts` | YENİ - Style Map ile | ~40 |
| 2 | `types.ts` | Güncelle - constants ekle | ~60 |
| 3 | `utils/table-url.ts` | YENİ - QR URL helper | ~25 |
| 4 | `components/TableSkeleton.tsx` | YENİ - Loading state | ~20 |
| 5 | `components/StatusBadge.tsx` | YENİ - DRY badge | ~30 |
| 6 | `components/TableActions.tsx` | YENİ - actions | ~25 |
| 7 | `components/TableCard.tsx` | Refactor - token kullan | ~40 |
| 8 | `components/TableForm.tsx` | Refactor - FormInput kullan | ~60 |
| 9 | `components/AreaForm.tsx` | Refactor - FormInput kullan | ~50 |
| 10 | `components/TablesClient.tsx` | Parçala + useMemo | ~150 |
| 11 | `components/QrCodeModal.tsx` | YENİ - utils kullan | ~60 |

---

## Kontrol Listesi (Refactoring Sonrası)

- [ ] Status config `enums/` içinde mi? (Style Map ile)
- [ ] QR URL `utils/table-url.ts` içinde mi?
- [ ] Skeleton loader var mı?
- [ ] useMemo ile filtreleme yapılıyor mu?
- [ ] Form component'leri `FormInput` kullanıyor mu?
- [ ] Component boyutları MAX 200 satır altında mı?
- [ ] Design token'lar kullanılmış mı?
