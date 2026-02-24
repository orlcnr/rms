# POS Terminal Standardizasyon Planı

## Genel Bakış

Bu plan, POS terminalini diğer modüllerle tam uyumlu hale getirmek için yapılması gereken değişiklikleri kapsar.

---

## Mevcut Durum Analizi

### 1. Routing Yapısı
| Dosya | Mevcut Durum | Sorun |
|-------|-------------|-------|
| `TablesClient.tsx` (line 211) | `/pos/order/${table.id}` | Yanlış route |
| `web/app/(main)/pos/page.tsx` | `/pos` | Masa seçimi gerektiriyor |
| `web/app/(main)/pos/[tableId]/page.tsx` | `/pos/[tableId]` | Doğru ama kullanılmıyor |

### 2. Header Yapısı
| Bileşen | Durum |
|---------|-------|
| `MainHeader.tsx` | ✅ Var - Masa Yönetimi ile aynı |
| `POSInterface.tsx` (lines 182-212) | ❌ Ayrı header - tekrarlanmış |
| Sub-header | ❌ Yok |

### 3. Tasarım Sorunları
| Sorun | Konum |
|-------|-------|
| `rounded-[2rem]` (line 35) | `pos/[tableId]/page.tsx` |
| `backdrop-blur-sm` | `pos/[tableId]/page.tsx` |
| `shadow-2xl` | `pos/[tableId]/page.tsx` |
| Panel arası gölgeli container | `pos/[tableId]/page.tsx` |
| Product kartları shadow | `PosClient.tsx` (line 165) |

---

## 1. Akıllı Yönlendirme (Routing)

### Hedef
- Masa tıklandığında → `/pos/[tableId]` sayfasına git
- Bu sayfa açıldığında → Masa seçimi SORMAMALI, doğrudan masanın adisyonunu yüklemeli

### Yapılacak Değişiklikler

#### 1.1 TablesClient'de Route Düzeltme
```typescript
// web/modules/tables/components/TablesClient.tsx - line 211
// ESKI:
router.push(`/pos/order/${table.id}`)

// YENİ:
router.push(`/pos/${table.id}`)
```

#### 1.2 Route Yapısı Temizliği
```
web/app/(main)/pos/
├── page.tsx              # Ana sayfa - doğrudan /pos/[tableId]'e yönlendir veya masa seçim ekranı göster
├── [tableId]/
│   └── page.tsx          # Masa adisyonu - mevcut (düzeltilecek)
└── _components/
    └── PosClient.tsx     # Client bileşeni - yeniden düzenlenecek
```

#### 1.3 Root /pos Sayfası
- Kullanıcı doğrudan `/pos` ziyaret ettiğinde:
  - Önceki state'e bakarak masa seçimi göster
  - Veya açık siparişi olan masalara yönlendir

---

## 2. Header & Navigasyon Senkronizasyonu

### Hedef
- POS sayfasında `MainHeader` (Masa Yönetimi ile birebir aynı) kullanılmalı
- Altına ince bir **Sub-header** eklenmeli

### Sub-header Yapısı
```typescript
// Yeni dosya: web/modules/pos/components/PosSubHeader.tsx
interface PosSubHeaderProps {
  tableName: string;
  orderNumber?: string;
  onBack: () => void;
}
```

### Sub-header Tasarımı
```tsx
<div className="h-12 border-b border-border-light bg-bg-surface flex items-center px-4 gap-4">
  {/* Geri Butonu */}
  <Button variant="ghost" size="sm" onClick={onBack}>
    <ArrowLeft size={16} />
  </Button>
  
  {/* Masa Bilgisi */}
  <div className="flex items-center gap-2">
    <span className="text-sm font-bold text-text-primary">{tableName}</span>
    {orderNumber && (
      <span className="text-xs text-text-muted">#{orderNumber}</span>
    )}
  </div>
  
  {/* Sipariş Tipi (isteğe bağlı) */}
  <Select value={orderType} onChange={handleOrderTypeChange}>
    <SelectTrigger>...</SelectTrigger>
  </Select>
</div>
```

### Header Entegrasyonu
- `MainHeader` zaten `layout.tsx` içinde tüm sayfalara uygulanıyor
- POS sayfası için özel bir layout gerekmiyor
- Sadece POSInterface içindeki mevcut header kaldırılmalı

---

## 3. Tasarım Standartlarına Dönüş

### Hedef
- Products modülü gibi ferah, border-border-light ile ayrılmış paneller
- Beyaz kutu, gölge, yuvarlak köşeler KALDIRILACAK

### Yapılacak Değişiklikler

#### 3.1 [tableId]/page.tsx Temizliği
```typescript
// ESKI:
<div className="flex-1 min-h-0 p-4 flex flex-col">
  <div className="flex-1 min-h-0 rounded-[2rem] overflow-hidden border border-white/5 bg-[#0d0912]/50 backdrop-blur-sm shadow-2xl">
    <POSInterface ... />
  </div>
</div>

// YENİ:
<div className="flex-1 min-h-0 p-4 flex flex-col">
  <POSInterface ... />
</div>
```

#### 3.2 Panel Yapısı (3 Dikey Panel)
```
┌─────────────────────────────────────────────────────────────┐
│ MainHeader                                                  │
├─────────────────────────────────────────────────────────────┤
│ PosSubHeader                                               │
├──────────┬─────────────────────────────┬───────────────────┤
│ KATEGORİ │      ÜRÜNLER                │      SEPET        │
│          │                             │                   │
│ [TÜMÜ]  │  ┌─────┐ ┌─────┐ ┌─────┐  │  Ürün 1    2x    │
│ [Kebap] │  │Ürün1│ │Ürün2│ │Ürün3│  │  Ürün 2    1x    │
│ [İçecek]│  └─────┘ └─────┘ └─────┘  │                   │
│ [Tatlı] │  ┌─────┐ ┌─────┐ ┌─────┐  │  ─────────────    │
│          │  │Ürün4│ │Ürün5│ │Ürün6│  │  TOPLAM: 150 TL  │
│          │  └─────┘ └─────┘ └─────┘  │                   │
└──────────┴─────────────────────────────┴───────────────────┘
```

#### 3.3 Border ile Ayırma
```tsx
// Sol Panel (Kategoriler)
<div className="w-56 flex-shrink-0 flex flex-col border-r border-border-light">

// Sağ Panel (Sepet)
<div className="w-72 flex-shrink-0 flex flex-col border-l border-border-light bg-bg-surface">
```

#### 3.4 Ürün Kartları - ProductCard Referansı
```tsx
// PosClient.tsx veya POSProductGrid'deki ürün kartları
// ProductCard.tsx yapısına benzer şekilde:

<div className="bg-bg-surface border border-border-light rounded-sm p-2 group hover:border-border-medium transition-all flex flex-col h-28">
  {/* İkon */}
  <div className="w-full h-8 bg-bg-muted flex items-center justify-center mb-1">
    <Package size={20} />
  </div>
  
  {/* İçerik */}
  <div className="flex-1 min-w-0">
    <h3 className="text-[10px] font-bold uppercase">{item.name}</h3>
    <p className="text-[9px] text-text-muted">{formatCurrency(item.price)}</p>
  </div>
</div>
```

---

## 4. Mobil Uyumluluk (Responsive POS)

### Hedef
- 3 panel yan yana sığmadığında uygun yapı
- Tablet ve mobil için optimize

### Breakpoint Stratejisi
| Ekran Genişliği | Düzen |
|-----------------|-------|
| `≥1024px` | 3 panel yan yana |
| `768px-1023px` | Kategoriler Drawer/Modal, ürünler + sepet yan yana |
| `<768px` | Tab sistemi: Kategoriler üstte scrollable, ürünler grid-cols-2, sepet bottom sheet |

### 4.1 Mobil Yapı

#### Alt Bar - "Sepeti Gör"
```tsx
// Mobil için fixed bottom bar
<div className="fixed bottom-0 left-0 right-0 h-16 bg-bg-surface border-t border-border-light flex items-center justify-between px-4 z-50 md:hidden">
  <div className="flex flex-col">
    <span className="text-xs text-text-muted">{itemCount} ürün</span>
    <span className="text-base font-black">{formatCurrency(totalAmount)}</span>
  </div>
  <Button variant="primary" onClick={() => setIsBasketOpen(true)}>
    Sepeti Gör
  </Button>
</div>
```

#### Kategoriler - Yatay Scrollable Tabs
```tsx
// Mobilde yatay kaydırılabilir kategori listesi
<div className="flex gap-2 overflow-x-auto pb-2 md:hidden">
  <button className="px-4 py-2 bg-primary-main text-white rounded-full text-sm whitespace-nowrap">
    Tümü
  </button>
  {categories.map(cat => (
    <button key={cat.id} className="px-4 py-2 bg-bg-muted text-text-secondary rounded-full text-sm whitespace-nowrap">
      {cat.name}
    </button>
  ))}
</div>
```

#### Ürünler - grid-cols-2
```tsx
// Mobilde 2 kolon
<div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
  {filteredProducts.map(item => (...))}
</div>
```

### 4.2 Drawer/Tab Sistemi
```tsx
// Mobil için state
const [activeTab, setActiveTab] = useState<'categories' | 'products' | 'basket'>('products')

// Desktop: 3 panel
// Mobile: Tek panel, tab ile geçiş
```

---

## Dosya Yapısı (Son Durum)

```
web/
├── app/(main)/pos/
│   ├── page.tsx                    # Yönlendirme veya masa seçim
│   └── [tableId]/
│       └── page.tsx                # Ana POS sayfası
│
web/modules/pos/
│   ├── types.ts                    # ✓ Mevcut
│   ├── service.ts                  # ✓ Mevcut
│   ├── hooks/
│   │   ├── usePosBasket.ts         # ✓ Mevcut
│   │   ├── usePosMenu.ts           # ✓ Mevcut
│   │   └── usePosSession.ts        # ✓ Mevcut
│   └── components/
│       ├── PosSubHeader.tsx        # YENİ - Alt header
│       ├── PosMobileLayout.tsx     # YENİ - Mobil layout
│       └── PosDesktopLayout.tsx    # YENİ - Desktop layout
│
web/modules/orders/components/pos/
│   ├── POSInterface.tsx            # DÜZENLEME - Header kaldırılacak
│   ├── POSProductGrid.tsx          # DÜZENLEME - Mobil uyumluluk
│   └── POSCart.tsx                 # DÜZENLEME - Mobil uyumluluk
│
web/modules/tables/components/
│   └── TablesClient.tsx            # DÜZENLEME - Route düzeltme
```

---

## Uygulama Sırası

### Adım 1: Routing Düzeltmesi
- [ ] `TablesClient.tsx` - route düzeltme
- [ ] Test: Masa tıklandığında doğru sayfaya gidiyor mu?

### Adım 2: Header & Sub-header
- [ ] `PosSubHeader.tsx` bileşeni oluştur
- [ ] `POSInterface.tsx` içindeki header'ı kaldır
- [ ] MainHeader'ın doğru çalıştığını doğrula

### Adım 3: Tasarım Temizliği
- [ ] `[tableId]/page.tsx` - gölge ve efektleri kaldır
- [ ] Panelleri border-border-light ile düzenle
- [ ] Ürün kartlarını ProductCard referansına göre düzelt

### Adım 4: Mobil Uyumluluk
- [ ] PosMobileLayout bileşeni oluştur
- [ ] Bottom sheet / Tab sistemi ekle
- [ ] Kategorileri horizontal scrollable yap
- [ ] grid-cols-2 uygula

---

## Referans Dosyalar

| Referans | Kullanım |
|----------|----------|
| `web/modules/shared/components/MainHeader.tsx` | Header yapısı |
| `web/modules/products/components/ProductCard.tsx` | Ürün kartları |
| `web/modules/tables/components/TablesClient.tsx` | Masa navigasyonu |
| `web/app/(main)/layout.tsx` | Main layout |
