# Operations Modülü Refactor Planı

## 📋 Mevcut Durum Analizi

```
frontend/modules/operations/
├── index.ts                    ✅ (var)
├── service.ts                  ✅ (var)
├── types.ts                    ✅ (var)
├── README.md                   ℹ️ (dokümantasyon)
├── components/
│   ├── index.ts               ✅ (var)
│   ├── AreaTabs.tsx           ✅ (var)
│   ├── EmptyState.tsx         ✅ (var)
│   ├── OperationsHeader.tsx  ✅ (var)
│   ├── OperationsSearch.tsx   ✅ (var)
│   ├── TableCard.tsx          ✅ (var)
│   └── TableGrid.tsx          ✅ (var)
├── hooks/
│   ├── index.ts               ✅ (var)
│   ├── useOperationsData.ts   ✅ (var)
│   ├── useOperationsSocket.ts ✅ (var)
│   ├── useQrModal.ts          ✅ (var)
│   └── useTableFilters.ts      ✅ (var)
└── utils/
    └── tableHelpers.ts        ℹ️ (proje özel)
```

## 🎯 Skill Yapısı ile Karşılaştırma

Skill'de önerilen yapı:
```
/modules/[module_name]/
├── components/
│   ├── [ComponentName].tsx
│   └── index.ts               ✅
├── hooks/
│   ├── use[HookName].ts
│   └── index.ts               ✅
├── service.ts                 ✅
├── types.ts                   ✅
├── schemas.ts                 ❌ (eksik - opsiyonel)
└── index.ts                   ✅
```

## 📦 Önerilen Değişiklikler

### 1. schemas.ts Ekleme (Opsiyonel)

Operations modülü için Zod validation schemas eklenebilir:

```typescript
// frontend/modules/operations/schemas.ts
import { z } from 'zod';

// Area filter schema
export const areaFilterSchema = z.union([
  z.literal('all'),
  z.string().uuid()
]);

// QR modal schemas
export const qrModalSchema = z.object({
  mode: z.enum(['single', 'bulk']),
  tableId: z.string().uuid().optional(),
});

// Stats query schema
export const operationsStatsSchema = z.object({
  restaurantId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
```

### 2. Component Index Güncelleme

```typescript
// frontend/modules/operations/components/index.ts
export { AreaTabs } from './AreaTabs';
export { EmptyState } from './EmptyState';
export { OperationsHeader } from './OperationsHeader';
export { OperationsSearch } from './OperationsSearch';
export { TableCard } from './TableCard';
export { TableGrid } from './TableGrid';
```

### 3. Types Dosyasına Eklemeler

```typescript
// frontend/modules/operations/types.ts
// Mevcut tiplere ek olarak:
import { z } from 'zod';
import { areaFilterSchema, qrModalSchema } from './schemas';

// Schema'dan type çıkarma
export type AreaFilterInput = z.infer<typeof areaFilterSchema>;
export type QrModalInput = z.infer<typeof qrModalSchema>;
```

### 4. README Güncelleme (Opsiyonel)

Modül dokümantasyonu eklenebilir.

---

## 🤔 Sorular

1. **schemas.ts eklesel mi mi?**  
   - Eklemek istersen form validation için Zod kullanılacak
   - Şu an için gerekli değilse skip edebiliriz

2. **Utils klasörüne ne olacak?**  
   - `tableHelpers.ts` component'ler içine taşınabilir veya olduğu gibi bırakılabilir
   - Önerim: Helper fonksiyonları ilgili component'lere taşımak

3. **Hangi hook'lar ayrı dosya olarak çıkarılmalı?**  
   - `useOperationsData` - veri fetch etme
   - `useOperationsSocket` - real-time bağlantı
   - `useTableFilters` - filtreleme mantığı
   - `useQrModal` - QR modal yönetimi

---

## ✅ Sonraki Adımlar

1. schemas.ts ekle
2. Component index'leri güncelle  
3. README güncelle
4. Utils'i temizle (opsiyonel)

**Tahmini değişiklik sayısı:** 2-3 dosya eklenecek/güncellenecek
