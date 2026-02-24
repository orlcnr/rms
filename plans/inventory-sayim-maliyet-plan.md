# Envanter Modülüne "Sayım" ve "Maliyet" Özellikleri Ekleme Planı

## 1. Types Güncellemeleri

### 1.1 Ingredient Tipi
```typescript
export interface Ingredient extends BaseEntity {
    name: string
    unit: string
    restaurant_id: string
    critical_level: number
    stock?: Stock
    // YENİ ALANLAR:
    average_cost?: number    // Ortalama maliyet (₺)
    last_price?: number      // Son alış fiyatı (₺)
}
```

### 1.2 StockMovement Tipi
```typescript
export interface StockMovement extends BaseEntity {
    type: MovementType
    quantity: number
    reason: string
    ingredient_id: string
    ingredient?: Ingredient
    // YENİ ALANLAR (opsiyonel):
    unit_price?: number       // Birim fiyat (giriş hareketlerinde)
    supplier_id?: string     // Tedarikçi ID (giriş hareketlerinde)
}
```

---

## 2. StockTable - Hızlı Sayım Modu (Bulk Edit)

### 2.1 UI Tasarımı

```
┌─────────────────────────────────────────────────────────────────────┐
│  MALZEME LİSTESİ                    [Hızlı Sayım Modu] [✓]      │
├─────────────────────────────────────────────────────────────────────┤
│ MALZEME BİLGİSİ          BİRİM  MEVCUT STOK    MALİYET  DURUM   │
├─────────────────────────────────────────────────────────────────────┤
│ UN (GIDA)                kg    [    150   ]    12,50   ✓ OK      │
│ ZEYTİNYAĞI              lt    [     50   ]    45,00   ⚠ KRT    │
│ DOMATES SALÇASI          kg    [      0   ]    18,75   ✕ BİTTİ  │
│                           ...                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                          [TOPLU KAYDET]            │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Bileşen Yapısı

| Dosya | Değişiklik |
|-------|-----------|
| `StockTable.tsx` | `isBulkEditMode` state eklenecek |
| | Toggle switch eklenecek (Tablo header) |
| | `Mevcut Stok` sütunu: normal → input dönüşümü |
| | `Maliyet` yeni sütunu eklenecek |
| | `Toplu Kaydet` butonu eklenecek |

### 2.3 Props Yapısı

```typescript
interface StockTableProps {
    ingredients: Ingredient[]
    onAddMovement: (ingredient: Ingredient, type: MovementType) => void
    onEdit: (ingredient: Ingredient) => void
    // YENİ:
    isBulkEditMode?: boolean
    onBulkSave?: (updates: BulkStockUpdate[]) => void
}

interface BulkStockUpdate {
    ingredientId: string
    newQuantity: number
    averageCost?: number
}
```

### 2.4 Davranış

1. **Mod Açık**:
   - Stok değerleri input'a döner
   - Input'ta `autoFocus` ve `selectAll` olsun
   - Enter tuşu → sonraki satıra geç
   - Tab tuyu → sonraki alana geç

2. **Mod Kapalı** (varsayılan):
   - Mevcut davranış korunur

---

## 3. StockMovementForm - Birim Fiyat

### 3.1 UI Tasarımı

```
┌─────────────────────────────────────┐
│ STOK HAREKETİ                       │
├─────────────────────────────────────┤
│ İşlem Tipi:  [● Giriş  ○ Çıkış]   │
├─────────────────────────────────────┤
│ Malzeme:     [DOMATES SALÇASI  ✓]  │
│ Miktar:      [         50    ]      │
│                                     │
│ ▼ Giriş Detayları (sadece Giriş'te)│
│   Birim Fiyat: [    18,75   ] ₺    │
│   Tedarikçi:   [Seçiniz...    ▼]   │
│                                     │
│ Neden/Açıklama: [                 ] │
│                [Sayım Farkı|Tedarik]│
│                                     │
│        [İPTAL]        [KAYDET]      │
└─────────────────────────────────────┘
```

### 3.2 Bileşen Yapısı

| Dosya | Değişiklik |
|-------|-----------|
| `StockMovementForm.tsx` | `unitPrice` ve `supplierId` state eklenecek |
| | Giriş tipi seçildiğinde `unitPrice` alanı gösterilecek |
| | Form submit'te yeni alanlar dahil edilecek |

### 3.3 Form State

```typescript
interface StockMovementFormData {
    type: MovementType
    ingredientId: string
    quantity: number
    reason: string
    // YENİ ALANLAR:
    unit_price?: number
    supplier_id?: string
}
```

### 3.4 Koşullu Gösterim

```typescript
// Giriş (IN) seçildiğinde göster
{formData.type === MovementType.IN && (
    <div className="space-y-4">
        <FormInput 
            id="unitPrice" 
            label="BİRİM FİYAT (₺)"
            // ...
        />
        {/* Tedarikçi select - sonra eklenebilir */}
    </div>
)}
```

---

## 4. Backend Entegrasyonu (Sonraki Aşama)

### 4.1 Ortalama Maliyet Hesaplama

Aritmetik ortalama formülü:
```
yeni_ortalama = ((eski_stok * eski_ortalama) + (giren_miktar * birim_fiyat)) / (eski_stok + giren_miktar)
```

### 4.2 API Endpoint (Örnek)

```typescript
// POST /api/inventory/movements
{
    type: 'IN',
    ingredient_id: 'uuid',
    quantity: 50,
    unit_price: 18.75,      // Yeni alan
    supplier_id: 'uuid',     // Yeni alan (opsiyonel)
    reason: 'TEDARIK'
}
```

### 4.3 Service Mantığı

```typescript
// Backend'de (inventory.service.ts)
async createMovement(dto: CreateStockMovementDto) {
    const movement = await this.repository.save(dto)
    
    // Eğer GİRİŞ ve birim fiyat verildiyse
    if (dto.type === MovementType.IN && dto.unit_price) {
        await this.updateAverageCost(
            dto.ingredient_id,
            dto.unit_price,
            dto.quantity
        )
    }
    
    return movement
}
```

---

## 5. Uygulama Sırası

| Adım | Açıklama | Öncelik |
|------|----------|---------|
| 1 | `types.ts` güncelleme (Ingredient, StockMovement) | 🔴 Yüksek |
| 2 | StockTable - Hızlı Sayım modu toggle ve input dönüşümü | 🔴 Yüksek |
| 3 | StockTable - Toplu kaydetme fonksiyonu | 🔴 Yüksek |
| 4 | StockMovementForm - Birim fiyat alanı ekleme | 🔴 Yüksek |
| 5 | Form submit mantığı (yeni alanlar dahil) | 🔴 Yüksek |
| 6 | Backend service güncelleme (ortalama maliyet) | 🟡 Orta |
| 7 | API endpoint güncelleme | 🟡 Orta |

---

## 6. Dikkat Edilecek Noktalar

1. **Maliyet Gösterimi**: 
   - Tabloda "Maliyet" sütunu eklenecek
   - Format: `18,75 ₺` (Türkçe format)

2. **Hızlı Sayım Modu**:
   - Toggle açıkken yanlışlıkla değişiklik önlemek için
   - Değişiklikler anında kaydedilmeyecek
   - "Toplu Kaydet" butonuna basınca gidecek

3. **Birim Fiyat**:
   - Sadece Giriş (IN) hareketlerinde gösterilecek
   - Çıkış (OUT) ve Düzeltme (ADJUST)'te gizli kalacak

4. **Geriye Uyumluluk**:
   - Eski hareketlerde birim_fiyat olmayabilir
   - Kod buna göre defensive yazılmalı

---

## 7. Örnek Kullanım Senaryoları

### Senaryo 1: Hızlı Sayım
```
1. Kullanıcı "Hızlı Sayım Modu"nu açar
2. Tüm stok değerleri input'a döner
3. Kullanıcı fiziksel sayım sonuçlarını girer
4. "Toplu Kaydet" butonuna basar
5. Sistem:
   - Her malzeme için stock.quantity güncellenir
   - Fark (sayım sonucu - mevcut) = ADJUST hareketi olarak kaydedilir
```

### Senaryo 2: Tedarikten Alış
```
1. Kullanıcı yeni malzeme girişi yapar
2. IN tipini seçer
3. Miktar ve birim fiyat girer
4. Kaydeder
5. Backend:
   - Hareket kaydedilir
   - Malzemenin average_cost güncellenir
```
