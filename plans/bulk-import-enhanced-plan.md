# Toplu Ürün İçe Aktarma (Enhanced Plan) - v3

## Mevcut Durum
İlk versiyon tamamlandı ancak kullanıcı geri bildirimi ile geliştirilmesi gerekiyor.

## Yeni Akış (4 Adım)

### Adım 1: Dosya Yükleme
- Excel/CSV/JSON dosyası yükle
- Dosya parse edilir ve column'lar okunur

### Adım 2: Kolon Eşleştirme (YENİ)
```
┌─────────────────────────────────────────────────────────────────────┐
│  KOLON EŞLEŞTİRME                                                │
├─────────────────────────────────────────────────────────────────────┤
│  [Şablon: ▼ Seç]  [+ Yeni Şablon]                                │
├──────────────────────────┬──────────────────────────────────────────┤
│  Excel Kolonları         │  Sistem Alanları                         │
├──────────────────────────┼──────────────────────────────────────────┤
│  [Stok Kodu        ▼]   │  ┌ Ürün Adı (name)            ●         │
│  [Barkod          ▼]    │  ├ Fiyat (price)                      │
│  [Ürün Adı        ▼]    │  ├ Stok Kodu (sku)            ○         │
│  [Fiyat           ▼]    │  ├ Barkod (barcode)           ○         │
│  [Kategori        ▼]    │  ├ Kategori (category_id)      ○         │
│  [Birim           ▼]    │  ├ Açıklama (description)              │
│                         │  ├ Durum (is_active)                   │
│                         │  ├ -----------------------------------   │
│                         │  │  İNGREDİENT ALANLARI                │
│                         │  ├ Birim (unit)              ● (enum)   │
│                         │  └ Kritik Seviye (critical_level)       │
│                         │                                         │
│  [+ Alan Ekle]          │  [Şablon Kaydet]  [Temizle]           │
└──────────────────────────┴──────────────────────────────────────────┘
```

**Şablon Özellikleri:**
- Daha önce kaydedilmiş şablonları görüntüle (dropdown)
- Şablon seçildiğinde otomatik eşleştirme yap
- Yeni şablon kaydetme (isim vererek)
- Mevcut şablonu güncelleme

**Sistem Alanları:**
- `name` - Ürün Adı (zorunlu)
- `sku` - Stok Kodu
- `barcode` - Barkod
- `price` - Fiyat
- `description` - Açıklama
- `category_id` - Kategori
- `is_active` - Durum (varsayılan: true)

**İngredient Alanları:**
- `unit` - Birim (ENUM - zorunlu) ⚠️
  - Değerler: `adet`, `kg`, `gr`, `lt`, `ml`, `gram`, `porsiyon`
  - Inventory modülünden enum import edilecek
- `critical_level` - Kritik Seviye (varsayılan: 0)

### Adım 3: Önizleeme ve Doğrulama
```
┌─────────────────────────────────────────────────────────────────────┐
│  ÖNİZLEME ve DOĞRULAMA                                            │
├──────────────────────────┬──────────────────────────────────────────┤
│  # │ Stok Kodu │ Ürün    │ Fiyat   │ Birim │ Durum    │ Eylem   │
├──────────────────────────┼──────────────────────────────────────────┤
│  1 │ SKU001    │ Lahmacun│ 45.00   │ adet  │ ✓ Yeni   │ [Ekle]   │
│  2 │ SKU002    │ Pide    │ 55.00   │ kg    │ ✓ Yeni   │ [Ekle]   │
│  3 │ SKU003    │ Pizza   │ 80.00   │ pors. │ ◯ Güncelle│ [Ekle]  │
│  4 │           │ ⚠️ Hata │ -       │ -     │ ⚠️ Eksik │ [Düzelt] │
└──────────────────────────┴──────────────────────────────────────────┘

[Gerİ Adıma]  [İçe Aktar (150 ürün)]
```

### Adım 4: İçe Aktarma ve Sonuç
```
┌─────────────────────────────────────────────────────────────────────┐
│  İÇE AKTARMA TAMAMLANDI                                           │
├─────────────────────────────────────────────────────────────────────┤
│  ✓ 147 ürün başarıyla eklendi/güncellendi                          │
│  ✓ 147 ingredient başarıyla oluşturuldu/güncellendi                │
│  ⚠️ 3 ürün hatalı (eksik bilgi)                                    │
│                                                                     │
│  [Detaylı Rapor]  [Yeni İçe Aktarma]                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Template Yapısı

### ImportTemplate Entity (Güncellenmiş)
```typescript
{
  id: uuid,
  restaurant_id: string,
  name: string,                    // Şablon adı
  description: string,
  format: ImportFormat,           // excel/csv/json
  field_mappings: {
    // Excel kolonu -> Sistem alanı
    "Stok Kodu": "sku",
    "Ürün Adı": "name",
    "Fiyat": "price",
    "Birim": "unit"              // enum mapping
  },
  default_category_id: string,    // Varsayılan kategori
  default_unit: IngredientUnit,    // Varsayılan birim
  default_critical_level: number,  // Varsayılan kritik seviye
  is_default: boolean,
  created_by: string
}
```

## Unit Enum Yapısı

### 1. Unit Enum (backend/src/common/enums/unit.enum.ts)
```typescript
export enum IngredientUnit {
  ADET = 'adet',
  KG = 'kg',
  GR = 'gr',
  LT = 'lt',
  ML = 'ml',
  GRAM = 'gram',
  PORSİYON = 'porsiyon',
}
```

## Database Değişiklikleri

### 1. SKU Matches Tablosu (YENİ)
```sql
CREATE TABLE business.sku_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_sku VARCHAR(100),
  menu_item_id UUID REFERENCES business.menu_items(id),
  confidence_score DECIMAL(3,2),
  auto_matched BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Import Templates Güncelleme
```sql
ALTER TABLE business.import_templates ADD COLUMN default_category_id VARCHAR;
ALTER TABLE business.import_templates ADD COLUMN default_unit VARCHAR(10);
ALTER TABLE business.import_templates ADD COLUMN default_critical_level DECIMAL(10,3);
```

### 3. Import Job'a Ek Alanlar
```sql
ALTER TABLE business.import_jobs ADD COLUMN column_mappings JSONB;
ALTER TABLE business.import_jobs ADD COLUMN sku_match_results JSONB;
```

## Backend Değişiklikleri

### 1. Servisler
- `BulkImportService` - Ana import mantığı
- `ColumnMappingService` - Kolon eşleştirme
- `SkuMatchService` - SKU eşleştirme
- `TemplateService` - Şablon yönetimi (CRUD)

### 2. İçe Aktarma Akışı (Transactional)
```typescript
async function importProducts(jobId: string, mappings: ColumnMappings) {
  return this.dataSource.transaction(async (manager) => {
    for (const row of rows) {
      // 1. Ürünü bul veya oluştur
      const product = await this.menuService.upsert(manager, row, mappings);
      
      // 2. Ingredient oluştur/güncelle
      await this.ingredientService.upsert(manager, {
        name: product.name,
        unit: this.mapToEnum(row.unit, IngredientUnit),
        critical_level: mappings.default_critical_level || 0,
        restaurant_id: product.restaurant_id
      });
      
      // 3. SKU match kaydet
      await this.skuMatchService.record(manager, row.sku, product.id);
    }
  });
}
```

## Frontend Değişiklikleri

### 1. ColumnMappingPage Bileşenleri
- Template selector dropdown
- Template save dialog
- Field mapping rows
- Unit enum selector
- Validation status

### 2. Akış
```
Upload → ColumnMapping (with templates) → Preview → Import → Results
```

## Öncelik Sırası

1. **Unit Enum Oluştur** - backend/src/common/enums/unit.enum.ts
2. **Ingredient Entity Güncelle** - unit alanını enum yap
3. **SKU Matches Tablo** - Database
4. **Import Templates Güncelle** - yeni kolonlar
5. **Column Mapping UI** - şablon seçimi + kaydetme
6. **SkuMatchService** - Backend
7. **Transactional Import** - Backend
8. **Ingredient Auto-Creation** - Backend
