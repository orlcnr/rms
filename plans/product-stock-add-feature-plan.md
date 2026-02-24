# Ürüne Stok Ekleme Özelliği Planı

## Önemli Not: Kullanıcı Gereksinimi

> "ürün düzenleme yönetiminde malzeme ekleme alanını bozmazyız değilmi orada malzeme eklemeden stok ekleyemez olmalı değil mi?"

**Anladım:**
- ❌ Ürün düzenleme modal'ındaki malzeme ekleme alanını **BOZMAYIZ** (mevcut kalacak)
- ✅ Stok ekleme, **malzeme eklemek zorunda kalmadan** yapılabilmeli
- ✅ İki işlem **AYRI** olmalı

---

## Mevcut Durum Analizi

### Sistem Mimarisi
```
Ürün (MenuItem)
  ├── Stok Takibi: track_inventory (AÇ/KAPA)
  ├── Stok Bilgisi: stockInfo (toplam porsiyon, durum)
  └── Reçete (Recipe) → Malzeme (Ingredient) → Stok (Stock)
```

### Mevcut Durum
- `track_inventory = true` olan ürünlerde stock gösteriliyor (StockBadge)
- **Ancak stok ekleme özellik yok**
- Stok ekleme = Reçete/malzemeye bağlı olmamalı

---

## Yeni Plan: Ürüne Doğrudan Stok Ekleme

### Temel Fikir
- Ürünün kendisine **porsiyon bazlı stok** eklenebilmeli
- Reçete/malzeme eklemek **ZORUNLU DEĞİL**
- Stok ekleme = Ürünün "mevcut porsiyon sayısını" artırma

### Örnek Kullanım
```
Ürün: "Adana Kebap" (track_inventory: true, reçete: yok)
- Mevcut stok: 0 porsiyon
- Kullanıcı "10 porsiyon" ekle butonuna tıklar
- Stok: 10 porsiyon olur
```

---

## Teknik Çözüm

### Backend API
**Yeni Endpoint:**
```
POST /menus/:id/stock
Body: { quantity: number, note?: string }
```

Bu endpoint:
1. Ürünün stockInfo.totalPortions değerini artırır
2. Stok hareketi kaydı oluşturur (opsiyonel)

### Frontend

#### 1. MenuGridItem - Stok Ekle Butonu
```tsx
// Stock badge yanına + butonu
{showStockBadge && (
  <div className="absolute top-4 left-4 z-10 flex gap-2">
    <StockBadge stockInfo={item.stockInfo} trackInventory={item.track_inventory} />
    <button 
      onClick={() => openStockAddModal(item)}
      className="p-1.5 rounded-full bg-emerald-500/80 text-white hover:bg-emerald-500"
    >
      <Plus className="w-3 h-3" />
    </button>
  </div>
)}
```

#### 2. MenuStockAddModal
```tsx
// Basit modal - sadece miktar gir
<Modal size="sm" title="Stok Ekle">
  <div className="space-y-4">
    <div className="text-center">
      <h3 className="text-lg font-bold">{product.name}</h3>
      <p className="text-sm text-white/60">Mevcut: {product.stockInfo?.totalPortions || 0} porsiyon</p>
    </div>
    
    <div className="space-y-2">
      <label>Eklenecek Miktar (Porsiyon)</label>
      <Input 
        type="number" 
        min="1" 
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      />
    </div>

    <div className="flex gap-2">
      <Button variant="secondary" onClick={onClose}>İptal</Button>
      <Button onClick={handleAddStock}>Stok Ekle</Button>
    </div>
  </div>
</Modal>
```

---

## Dosyalar

### Frontend
1. **menus/service.ts** - `addStock` API metodu ekle
2. **_components/MenuStockAddModal.tsx** - Yeni modal component
3. **_components/MenuGridItem.tsx** - + butonu ekle
4. **MenusClient.tsx** - Modal state yönetimi

### Backend (gerekirse)
1. **menus.controller.ts** - `POST /:id/stock` endpoint
2. **menus.service.ts** - Stock ekleme mantığı

---

## Öncelik

1. **P0**: Backend endpoint (varsa kullan, yoksa oluştur)
2. **P0**: Frontend API metodu
3. **P0**: MenuStockAddModal component
4. **P0**: Grid'de + butonu
5. **P1**: Table'da buton (opsiyonel)

---

## Not
- Ürün düzenleme modal'ı **DEĞİŞTİRİLMEYECEK**
- Malzeme ekleme alanı old gibi kalacak
- Stok ekleme = Tamamen ayrı bir özellik
