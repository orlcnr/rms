# POS Terminal Nihai Standart Planı

## Genel Bakış

Bu plan, POS modülünü nihai haline getirmek için yapılması gereken değişiklikleri kapsar. Tüm tasarım öğeleri Products modülü ile uyumlu hale getirilecektir.

---

## 1. Route ve Akış Yönetimi

### Hedef
- **Yeni Route**: `/orders/pos/[orderId]` - ID = orderId
- Masa tıklandığında:
  - Eğer masada aktif sipariş varsa → o orderId ile sayfayı aç
  - Eğer yoksa → yeni sipariş oluştur → oluşan ID ile yönlendir

### Mantık Akışı
```
TablesClient → Masa tıklandı
  ↓
orderService.getActiveOrderByTableId(tableId)
  ↓
VARSA → router.push(`/orders/pos/${order.id}`)
YOKSA → orderService.create({ table_id: tableId, ... })
       → router.push(`/orders/pos/${newOrder.id}`)
```

### Dosyalar
| Dosya | Değişiklik |
|-------|------------|
| `web/modules/tables/components/TablesClient.tsx` | `handleTableClick` fonksiyonu güncellenecek |
| `web/app/(main)/orders/pos/[orderId]/page.tsx` | Yeni sayfa oluşturulacak |

---

## 2. Tasarım Referansı (Ürün Kataloğu Standartları)

### Global Header
- `MainHeader` zaten layout.tsx'te tüm sayfalarda mevcut
- Logo solda, kullanıcı profil alanı sağda

### Sub-Header (İşlem Çubuğu)
- **Yükseklik**: h-12 (48px)
- **Arka plan**: bg-bg-surface
- **İçerik**:
  - Sol: Geri butonu + "Masa: [Masa Adı]"
  - Sağ: Opsiyonel sipariş tipi seçici

### Panel Yapısı (3 Dikey Blok)

```
┌─────────────────────────────────────────────────────────────┐
│ MainHeader (logo + profil)                                  │
├─────────────────────────────────────────────────────────────┤
│ SubHeader: [← Geri] [Masa: Masa-1]                    │
├──────────┬─────────────────────────────┬──────────────────┤
│ KATEGORİ │      ÜRÜNLER               │    ADİSYON      │
│          │                             │                  │
│ [TÜMÜ]  │  ┌─────┐ ┌─────┐ ┌─────┐  │  Ürün 1    2x  │
│ [Kebap] │  │Karte│ │Karte│ │Karte│  │  Ürün 2    1x  │
│ [İçecek]│  └─────┘ └─────┘ └─────┘  │                  │
│          │                             │  ──────────────   │
│          │  ┌─────┐ ┌─────┐ ┌─────┐  │  ARA TOPLAM     │
│          │  │Karte│ │Karte│ │Karte│  │  TOPLAM         │
│          │  └─────┘ └─────┘ └─────┘  │  [ÖDEME]        │
└──────────┴─────────────────────────────┴──────────────────┘
```

---

## 3. Panel Detayları

### Sol Panel: Kategoriler
- **Tasarım**: Products modülündeki CategoryTabs referansı
- **Vurgu**: Turuncu (primary-main) active state için
- **Font**: Bold, uppercase
- **Temizlik**: Gereksiz paddingler kaldırılacak
- **ClassName**: 
  ```
  border-r border-border-light
  bg-bg-surface
  ```

### Orta Panel: Ürün Grid
- **Referans**: `web/modules/products/components/ProductCard`
- **Kart Yapısı**:
  ```
  bg-bg-surface
  border border-border-light
  rounded-sm (keskin köşe)
  hover:border-border-medium
  gölge YOK (shadow kaldır)
  ```
- **İçerik**:
  - Ürün ikonu (Package)
  - Ürün adı (bold, uppercase)
  - Fiyat (text-text-primary)
  - Status badge (SATIŞTA/KAPALI)
- **Grid**: `grid-cols-2` mobil, `grid-cols-4` desktop

### Sağ Panel: Adisyon
- **ClassName**: `border-l border-border-light bg-bg-surface`
- **Tam yükseklik**: `h-full`
- **Ürün Listesi**: Sade, kompakt
- **Miktar Butonları**: +/- kompakt

---

## 4. Muhasebe ve Temizlik

### KDV Kaldırma
**Mevcut Durum** (`POSCart.tsx` lines 32-34):
```typescript
const subtotal = items.reduce((sum, item) => sum + (item.price ?? 0) * item.cartQuantity, 0)
const tax = subtotal * 0.1  // ← KALKACAK
const total = subtotal + tax  // ← KALKACAK
```

**Yeni Durum**:
```typescript
const subtotal = items.reduce((sum, item) => sum + (item.price ?? 0) * item.cartQuantity, 0)
const total = subtotal  // ← ARA TOPLAM ile aynı
```

### KDV Satırı Kaldırma
**Mevcut** (lines 136-139):
```
ARA TOPLAM     ₺100.00
KDV (%10)      ₺10.00
───────────────
TOPLAM         ₺110.00
```

**Yeni**:
```
ARA TOPLAM     ₺100.00
TOPLAM         ₺100.00
───────────────
[ÖDEME]
```

### Efektleri Silme
Kaldırılacaklar:
- `shadow-xl`, `shadow-2xl`, `shadow-md`
- `rounded-2xl`, `rounded-[2rem]`
- `backdrop-blur-*`
- `gradient`, `bg-gradient-*`
- "Sayfa içinde sayfa" hissi veren dış çerçeveler

### Panel Arası Border
```
Sol Panel:  border-r border-border-light
Sağ Panel:  border-l border-border-light
```

---

## 5. Responsive Yapı

### Desktop (≥1024px)
- 3 panel yan yana
- Sepet her zaman görünür

### Mobil (<768px)
- Paneller dikeyde üst üste:
  1. Kategoriler (horizontal scrollable tabs)
  2. Ürün Grid (grid-cols-2)
  3. Adisyon (drawer olarak)
- **Alt Bar**: "Sepeti Gör" - tıklandığında drawer açılır

---

## 6. Dosya Yapısı

```
web/
├── app/(main)/
│   └── orders/
│       └── pos/
│           └── [orderId]/
│               └── page.tsx          # YENİ - Order-based POS
│
├── modules/
│   ├── pos/
│   │   ├── components/
│   │   │   ├── PosSubHeader.tsx      # ✓ Var
│   │   │   ├── PosCategories.tsx     # DÜZENLEME - Categories panel
│   │   │   └── PosProductGrid.tsx    # DÜZENLEME - Products grid
│   │   │
│   └── orders/components/pos/
│       ├── POSInterface.tsx          # DÜZENLEME - Full layout
│       ├── POSProductGrid.tsx        # KALDIRILACAK - PosCategories/Grid ile değişecek
│       └── POSCart.tsx              # DÜZENLEME - KDV kaldırılacak
│
└── modules/tables/
    └── components/
        └── TablesClient.tsx          # DÜZENLEME - Route değişikliği
```

---

## 7. Uygulama Sırası

### Adım 1: Route Sistemi
- [ ] `TablesClient.tsx` - yeni akış mantığı ekle
- [ ] `orders/pos/[orderId]/page.tsx` - yeni sayfa oluştur

### Adım 2: Tasarım Temizliği
- [ ] `POSInterface.tsx` - tüm efektleri kaldır
- [ ] Panel yapısını 3 blok olarak düzenle

### Adım 3: ProductCard Entegrasyonu
- [ ] `POSProductGrid.tsx` - ProductCard yapısını uygula
- [ ] Kartları rounded-sm, border-border-light yap

### Adım 4: KDV Kaldırma
- [ ] `POSCart.tsx` - tax hesaplamasını kaldır
- [ ] KDV satırını kaldır
- [ ] ARA TOPLAM = TOPLAM göster

### Adım 5: Responsive
- [ ] Mobil bottom bar ekle
- [ ] Drawer yapısı

---

## 8. Referans Dosyalar

| Referans | Konum | Kullanım |
|----------|-------|----------|
| ProductCard | `web/modules/products/components/ProductCard.tsx` | Ürün kartı tasarımı |
| CategoryTabs | `web/modules/products/components/CategoryTabs.tsx` | Kategori tasarımı |
| MainHeader | `web/modules/shared/components/MainHeader.tsx` | Global header |
| PosSubHeader | `web/modules/pos/components/PosSubHeader.tsx` | Sub-header (mevcut) |

---

## 9. Özet Tablo

| Öğe | Mevcut | Yeni |
|------|--------|------|
| Route | `/pos/[tableId]` | `/orders/pos/[orderId]` |
| Header | POSInterface içinde | MainHeader + SubHeader |
| KDV | %10 hesaplanıyor | KALKACAK |
| Border | shadow, rounded | sadece border-border-light |
| Sepet | Sabit sağ panel | Mobil: drawer |
