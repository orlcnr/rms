# UI İyileştirme Planı - Ürün Kartları, Modal ve Reçete Tablosu

## Genel Bakış

Bu plan, ürün kartlarını daha kompakt hale getirmek, ürün düzenleme modalındaki inputları iyileştirmek ve reçete yönetimi tablosunu standartlaştırmak için gereken değişiklikleri içerir.

---

## 1. Ürün Kartı (`ProductCard.tsx`) İyileştirmeleri

### 1.1 Görsel Alanı
- **Mevcut Durum:** `aspect-square` (1:1 oran) kullanılıyor, ürün görseli var
- **Yeni Durum:** Görsel alanı tamamen kaldırılacak, yerine ikon gösterilecek
- **Değişiklik:**
  - Image container kaldırılacak
  - Bunun yerine `Package` ikonu ve "ÜRÜN" metni gösterilecek
  - Daha kompakt kart yapısı

### 1.2 Tipografi Hiyerarşisi
- **Ürün Adı:**
  - Mevcut: `text-xs font-black`
  - Yeni: `text-sm font-extrabold` veya `text-base font-bold`
  - Hedef: Daha belirgin ve okunaklı

- **Fiyat:**
  - Mevcut: `text-sm font-black` (bold)
  - Yeni: `text-base font-semibold` (medium)
  - Hedef: Fiyat hala önemli ama ad kadar kalın değil

### 1.3 Semantic Token Kontrolü
Zaten kullanılıyor: `bg-bg-surface`, `border-border-light`, `text-text-primary`, `text-text-secondary`, `text-success-main`

---

## 2. Ürün Düzenleme Modalı (`ProductForm.tsx`) İyileştirmeleri

### 2.1 Input Border Stili
- **Mevcut Durum:** Tüm inputlarda `border border-border-light` var
- **Yeni Durum:** Korunacak

### 2.2 Focus State
- **Mevcut Durum:** Bazı inputlarda `focus:border-primary-main` var
- **Yeni Durum:** Tüm inputlara `focus-visible:ring-primary-main` eklenecek

**Güncellenecek Inputlar:**
1. Ürün Adı input (satır 130-137)
2. Kategori select (satır 141-151)
3. Açıklama textarea (satır 157-162)
4. Fiyat input (satır 226-234)
5. Reçete malzeme select (satır 319-329)
6. Reçete miktar input (satır 332-340)
7. Hızlı stok overlay inputları (satır 377-381)

### 2.3 Mevcut Focus State'ler (Güncellenecek)
```typescript
// Eski
className="... focus:border-primary-main focus:ring-1 focus:ring-primary-main/20 ..."

// Yeni  
className="... focus-visible:ring-primary-main ..."
```

---

## 3. Reçete Yönetimi Tablosu İyileştirmeleri

### 3.1 Sayısal Değerler (text-right)
- **Konum:** Reçete miktar input'ları (satır 331-341)
- **Değişiklik:** `text-center` -> `text-right`

### 3.2 Satır Aralıkları (8px Spacing Scale)
- **Mevcut Durum:** `p-2` (8px)
- **Yeni Durum:** `py-3` (12px - 8px scale'e uygun)
- **Not:** 8px spacing scale: py-1=4px, py-2=8px, py-3=12px, py-4=16px

---

## 4. Semantic Token Kullanımı Kontrolü

### 4.1 Kullanılan Tokenlar (Zaten Doğru)
- `bg-bg-surface` ✓
- `bg-bg-app` ✓
- `border-border-light` ✓
- `border-border-medium` ✓
- `text-text-primary` ✓
- `text-text-secondary` ✓
- `text-text-muted` ✓
- `text-success-main` ✓
- `text-danger-main` ✓
- `text-info-main` ✓
- `text-primary-main` ✓

### 4.2 Güncellenecek Dosyalar
| Dosya | Değişiklik |
|-------|------------|
| `web/modules/products/components/ProductCard.tsx` | Görsel kaldırma, tipografi güncelleme |
| `web/modules/products/components/ProductForm.tsx` | Focus states, recipe table spacing |

---

## 5. Uygulama Adımları

### Adım 1: ProductCard Güncellemesi
```tsx
// ProductCard.tsx değişiklikleri:

// 1. Görsel container kaldır, ikon ekle
// 2. Tipografi güncelle:
//    - Product name: text-sm font-extrabold
//    - Price: text-base font-semibold
```

### Adım 2: ProductForm Focus States
```tsx
// ProductForm.tsx değişiklikleri:

// Tüm inputlara focus-visible:ring-primary-main ekle
// Eski: focus:border-primary-main focus:ring-1
// Yeni: focus-visible:ring-primary-main
```

### Adım 3: Recipe Table Güncellemesi
```tsx
// Recipe table değişiklikleri:

// 1. Row spacing: p-2 -> py-3
// 2. Quantity input: text-center -> text-right
```

---

## 6. Beklenen Sonuçlar

- **Daha kompakt ürün kartları:** Görsel alanı kaldırıldığında kartlar daha az yer kaplayacak
- **Daha iyi tipografi hiyerarşisi:** Ürün adı bold, fiyat medium - okunabilirlik artacak
- **Konsistent focus states:** Tüm inputlarda aynı focus visual
- **8px spacing uyumu:** Satır aralıkları standarda uygun
- **Semantic token kullanımı:** Tüm renkler token'lardan alınıyor

---

## 7. Riskler ve Dikkat Edilecekler

1. **Görsel kaldırma:** Ürün görseli olmayan kartlar tanınabilirliği etkileyebilir - ikon ile destekle
2. **Font boyutları:** Çok büyük font kart yüksekliğini artırabilir - test et
3. **Focus ring:** `focus-visible` sadece klavye navigasyonunda görünür - mouse kullanımını test et
