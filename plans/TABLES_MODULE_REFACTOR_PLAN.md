# Tables Modülü Frontend Refactoring Planı

> Bu doküman, Tables modülünün mevcut durumunu ve frontend kurallarına uygun hale getirmek için yapılması gereken değişiklikleri içerir.

---

## Mevcut Durum Analizi

### Yapı

```
web/modules/tables/
├── types.ts                        # Mevcut - İyileştirilmeli
├── components/
│   ├── AreaForm.tsx              # Mevcut - Refactor gerekli
│   ├── AreaTabs.tsx              # Mevcut - Refactor gerekli
│   ├── TableCard.tsx             # Mevcut - Tamamen yeniden yazılmalı
│   ├── TableForm.tsx             # Mevcut - Tamamen yeniden yazılmalı
│   ├── TableGrid.tsx             # Mevcut - İyileştirilmeli
│   └── TablesClient.tsx          # Mevcut - Parçalara ayrılmalı
└── services/
    └── tables.service.ts          # Mevcut - Kullanılabilir
```

---

## Sorunlar ve Çözümler

### 1. Design Token İhlalleri ❌

**Sorun:** TableCard'da default Tailwind renkleri kullanılmış:
- `text-emerald-400`, `bg-emerald-500/10`
- `text-red-400`, `bg-red-500/10`
- `text-blue-400`, `bg-blue-500/10`
- `text-gray-400`, `bg-white/5`

**Kural:**
> "Never use bg-gray-100, text-black, border-gray-300 etc."
> "Use bg-bg-app, text-text-primary, border-border-light etc."

**Çözüm:** Design token'ları kullan:
```typescript
// DOĞRU
color: 'text-success-main',
bg: 'bg-success-bg',
border: 'border-success-border',

// YANLIŞ (Mevcut)
color: 'text-emerald-400',
bg: 'bg-emerald-500/10',
```

---

### 2. Hardcoded Styling ❌

**Sorun:** AreaForm ve TableForm'da:
- `bg-white/5`, `border-white/10`, `rounded-2xl`
- `focus:ring-orange-500/10`, `focus:border-orange-500/50`
- Gradient efektler: `shadow-orange-900/40`

**Kural:**
> "Do NOT use gradients"
> "All UI must use Tailwind mapped design tokens"

**Çözüm:** FormInput, FormSection gibi shared component'leri kullan.

---

### 3. Status Mapping Component İçinde ❌

**Sorun:** TableCard.tsx (satır 16-45) içinde:
```typescript
const statusConfig = {
    [TableStatus.AVAILABLE]: { label: 'BOŞ', color: '...', ... },
    [TableStatus.OCCUPIED]: { label: 'DOLU', ... },
    ...
}
```

**Kural:**
> "Tüm statik veriler (seçenekler, etiketler, varsayılan değerler, helper fonksiyonlar) `types.ts` dosyasında tutulur"

**Çözüm:** types.ts'e taşı:
```typescript
// types.ts
export const TABLE_STATUS_CONFIG = {
    [TableStatus.AVAILABLE]: {
        label: 'BOŞ',
        labelEn: 'Available',
        color: 'success' as const,
    },
    [TableStatus.OCCUPIED]: {
        label: 'DOLU',
        labelEn: 'Occupied', 
        color: 'danger' as const,
    },
    ...
}
```

---

### 4. Component Boyutu (MAX 200 satır) ❌

**Sorun:** TablesClient.tsx 14.500+ satır

**Kural:**
> "Her component dosyası maksimum 200 satır olmalıdır"

**Çözüm:** Parçalara ayır:
- `TablesClient.tsx` → Sadece layout ve state koordinasyonu
- `TableList.tsx` → Masa listesi render
- `AreaManager.tsx` → Alan yönetimi
- `QrCodeModal.tsx` → QR kod modalı

---

### 5. Form Component'leri Yeniden Kullanılmıyor ❌

**Sorun:** AreaForm ve TableForm'da tekrar eden input stilleri

**Kural (DRY):**
> "Tüm form input'ları FormInput bileşeni kullanılarak oluşturulmalıdır"

**Çözüm:** FormInput kullan:
```typescript
import { FormInput } from '@/modules/shared/components/FormInput'
import { FormSection } from '@/modules/shared/components/FormSection'

<FormSection title="MASA BİLGİLERİ" variant="primary">
    <FormInput
        id="tableName"
        name="name"
        label="MASA ADI"
        value={formData.name}
        onChange={(value) => setFormData({...formData, name: value})}
        required
    />
</FormSection>
```

---

## Refactoring Adımları

### Adım 1: types.ts'i Güncelle

**Dosya:** `web/modules/tables/types.ts`

```typescript
// EKLENECEK: Status config
export const TABLE_STATUS_CONFIG = {
    [TableStatus.AVAILABLE]: {
        label: 'BOŞ',
        color: 'success' as const,
    },
    [TableStatus.OCCUPIED]: {
        label: 'DOLU', 
        color: 'danger' as const,
    },
    [TableStatus.RESERVED]: {
        label: 'REZERVE',
        color: 'info' as const,
    },
    [TableStatus.OUT_OF_SERVICE]: {
        label: 'KAPALI',
        color: 'muted' as const,
    },
}

// EKLENECEK: Form default değerleri
export const TABLE_FORM_DEFAULTS = {
    capacity: 4,
    status: TableStatus.AVAILABLE,
}

export const AREA_FORM_DEFAULTS = {
    name: '',
}
```

### Adım 2: TableCard'ı Yeniden Yaz

**Dosya:** `web/modules/tables/components/TableCard.tsx`

**Kurallara uygun hale getir:**
- Design token'lar kullan
- types.ts'den config import et
- Maksimum 100 satır

### Adım 3: TableForm'u Refactor Et

**Dosya:** `web/modules/tables/components/TableForm.tsx`

**Eklenecek:**
- FormInput component'i
- FormSection component'i
- RmsSwitch (status toggle için)

### Adım 4: AreaForm'u Refactor Et

**Dosya:** `web/modules/tables/components/AreaForm.tsx`

**Eklenecek:**
- FormInput component'i
- FormSection component'i

### Adım 5: TablesClient'ı Parçala

**Dosya:** `web/modules/tables/components/TablesClient.tsx`

**Ayrılacak component'ler:**
- `TableGrid.tsx` (zaten var - güncellenecek)
- `AreaTabs.tsx` (zaten var - güncellenecek)
- QR modal ayrı component'e çıkarılacak

### Adım 6: Son Kontroller

- [ ] Tüm renkler design token'dan geliyor mu?
- [ ] Form component'leri FormInput kullanıyor mu?
- [ ] Component boyutları 200 satır altında mı?
- [ ] types.ts'te tüm statik veriler var mı?
- [ ] Gradient yok mu?

---

## Yapılacaklar Listesi

```
[ ] 1. types.ts - Status config ve defaults ekle
[ ] 2. TableCard.tsx - Design token'lara geçir
[ ] 3. TableForm.tsx - FormInput/FormSection kullan
[ ] 4. AreaForm.tsx - FormInput/FormSection kullan
[ ] 5. TablesClient.tsx - Parçalara ayır (opsiyonel)
[ ] 6. Test et ve doğrula
```

---

## Notlar

- Frontend kuralları için: `.kilocode/rules/frontend-rules.md`
- Design token'lar için: `.kilocode/rules/frontent/rms-design-tokens-rules.md`
- DRY component'ler için: `.kilocode/rules/frontend-dry-component-rules.md`
