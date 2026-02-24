# POS Sipariş Terminali Oluşturma Planı

## Genel Bakış
Tables modülünden yönlendirilen `/pos` sayfası için Sipariş Terminali bileşeni oluşturulacak.

## Mevcut Durum
- `web/modules/pos/types.ts` ✓ Oluşturuldu
- `web/modules/pos/service.ts` ✓ Oluşturuldu

## Yapılacak İşler

### 1. Dosya Yapısı
```
web/modules/pos/
├── types.ts                 ✓ (mevcut)
├── service.ts              ✓ (mevcut)
├── hooks/
│   └── usePosBasket.ts     # Sepet yönetimi
└── components/
    └── PosTerminal.tsx     # Ana POS bileşeni

web/app/(main)/pos/
├── page.tsx                # Server component
└── _components/
    └── PosClient.tsx       # Client component
```

### 2. Tasarım Kuralları
- **Renkler**: Sadece tokenlar: `bg-bg-app`, `bg-bg-surface`, `text-text-primary`, `border-border-light`
- **Köşeler**: `rounded-sm` (maksimum 2px-4px)
- **Bileşenler**: `@/modules/shared/components/` altındaki Button, FormInput kullanılacak
- **Stil**: Flat, ciddi, yüksek kontrastlı - cam efekti, gradyan YASAK

### 3. Panel Yapısı

#### Sol Panel: Kategoriler (Navigasyon)
- Dikey liste veya geniş ikonlu kare butonlar
- `bg-bg-surface` arka plan
- `border-r border-border-light` ayrım
- Aktif kategori: `bg-primary-main text-white`

#### Orta Panel: Ürün Izgarası
- Seçilen kategoriye ait ürünler
- Grid yapısı
- Basit kart: Ürün adı, fiyat, stok durumu
- Tıklandığında sepete ekle
- `bg-bg-app` arka plan
- `rounded-sm` kartlar

#### Sağ Panel: Adisyon / Sepet
- `bg-bg-surface` arka plan
- `border-l border-border-light` ayrım

**Üst Kısım**:
- Masa adı, Garson adı, Açılış saati

**Orta Kısım** (scrollable):
- Ürün listesi
- Miktar +/- butonları
- Birim fiyat ve toplam

**Alt Kısım**:
- Toplam tutar
- KDV detayı
- "Mutfak Notu Ekle" alanı
- "SİPARİŞİ ONAYLA" (Primary)
- "İPTAL" (Ghost/Outline)

### 4. Teknik Gereksinimler
- Tam boy: `h-screen overflow-hidden`
- Sepet işlemleri: `usePosBasket` custom hook
- API: `posService` kullanılacak

### 5. Backend Entegrasyonu
- `GET /menus/categories/restaurants/:id` - Kategoriler
- `GET /menus/items/restaurants/:id` - Ürünler
- `GET /orders?status=...&tableId=...` - Masadaki sipariş
- `POST /orders` - Yeni sipariş
- `PATCH /orders/:id/items` - Sipariş güncelleme

## Öncelik Sırası
1. Hook ve types (temel yapı)
2. PosTerminal bileşeni (3 panel)
3. Page ve Client component
4. Tables'dan yönlendirme entegrasyonu
