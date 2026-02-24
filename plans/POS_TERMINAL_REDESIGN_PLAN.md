# POS Terminal Enterprise Redesign Planı

## Genel Bakış
Mevcut POS tasarımını profesyonel bir dijital terminal standartlarına çekmek için kapsamlı redesign.

---

## 1. PosSubHeader - "Kontrol Kulesi" Redesign

### Hedef
- Web sitesi header'ından bağımsız, "ekrana çakılmış" operasyon barı
- Gölgesiz, border-b-2 kalın alt çizgi ile ayrım

### Değişiklikler
```
Yapı: Fixed top, h-16, border-b-2 border-border-light

Sol Bölüm (Masa Durumu):
- bg-primary-subtle kutu içinde (p-2)
- Masa numarası: text-base font-black uppercase
- "Masa" etiketi: text-[10px] font-bold uppercase

Sağ Bölüm (Geri Butonu):
- aspect-square w-10 h-10
- bg-bg-muted içinde dairesel/kare
- ArrowLeft ikonu
```

---

## 2. PosCategories - Sol Dikey Sidebar

### Hedef
- Masaüstünde dikey sidebar, mobilde horizontal scroll

### Değişiklikler
```
Desktop: w-24 flex-col (dikey)
Mobile: horizontal scroll (mevcut)

Her Kategori Butonu:
- aspect-square (kare)
- İkon üste, metin alta
- text-[10px] font-bold uppercase
- Aktif: border-r-4 border-primary-main (sağ tarafta çentik)

Varsayılan "TÜMÜ" butonu da aynı formatta
```

---

## 3. PosProductGrid - Terminal Tuş Hissi

### Hedef
- E-ticaret kartından "dokunmatik terminal" mantığına geçiş

### Değişiklikler
```
Orta Panel (Ürünler):
- bg-bg-app (hafif gri - kartlardan ayırmak için)

Ürün Kartları:
- bg-bg-surface (beyaz)
- rounded-sm (2px - keskin köşeler)
- w-12 h-12 küçük görsel (varsa)
- Ürün adı: text-xs font-bold uppercase (büyük)
- Fiyat: text-primary-main, ürün adının altında

Sepet Sayacı Badge:
- Kartın üzerinde +1, x2 gibi
- bg-primary-main text-white rounded-full
```

---

## 4. PosBasket - Dijital Fiş

### Hedef
- "Adisyon" estetiği - fiziksel fiş görünümü

### Değişiklikler
```
Header:
- "ADİZYON" yazısı (font-black)
- Altında: Masa numarası + sipariş tipi

Ürün Satırları:
- Ürün adı: sola dayalı
- Fiyat: sağa dayalı
- Arada: border-b border-dotted (noktalı çizgi)

Adet Kontrolü:
- Kompakt butonlar (w-6 h-6)
- bg-bg-muted (koyu gri tonlar)

Action Bar (En Alt):
- h-16 (64px) yüksekliğinde devasa buton
- w-full
- "SİPARİŞ VER" veya "SİPARİŞİ GÜNCELLE"
```

---

## 5. Layout Değişiklikleri (OrdersClient)

### Hedef
- 3 bölümlü terminal düzeni

### Yeni Düzen
```
Desktop:
┌────────┬────────────────────┬────────────┐
│ Cat.   │   ÜRÜNLER          │  SEPET     │
│ Sidebar│   (bg-bg-app)      │ (Adisyon)  │
│ w-24   │   flex-1           │ w-[350px]  │
├────────┴────────────────────┴────────────┤
│         Action Bar (h-16)               │
└─────────────────────────────────────────┘

Mobile:
┌────────────────────┐
│   Header (fixed)   │
├────────────────────┤
│   Ürünler (grid)   │
├────────────────────┤
│  Sepet Button FAB  │
└────────────────────┘
```

---

## 6. Kaldırılacak Öğeler
- Paket servis select box (yok zaten)
- shadow-lg, shadow-md tüm gölgeler
- rounded-md, rounded-lg (sm'e çevrilecek)
- Gereksiz hover efektleri

---

## 7. Kullanılacak Shared Components
- Button (variant="primary" large)
- cn utility

---

## 8. Öncelik Sırası

### Phase 1: Layout & Structure
1. OrdersClient layout değişikliği (3 bölüm)
2. PosSubHeader redesign

### Phase 2: Categories & Products
3. PosCategories → Sol sidebar
4. PosProductGrid → Terminal tuş hissi
5. PosProductCard → Badge & fiyat pozisyonu

### Phase 3: Basket
6. PosBasket → Adisyon estetiği
7. Action bar devasa buton

### Phase 4: Polish
8. Shadow'ları kaldır
9. Border radius'ları minimize et
10. Responsive düzeltmeler

---

## Notlar
- Tüm değişiklikler mevcut fonksiyonelliği koruyacak
- Design Tokens (bg-*, text-*, border-*) kullanılacak
- State yönetimi (basketsByTable) bozulmayacak
