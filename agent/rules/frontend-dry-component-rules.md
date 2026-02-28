# DRY Component Extraction Rules

Bu doküman, web'de tekrarlanan UI bileşenlerinin merkezi olarak yönetilmesi için DRY (Don't Repeat Yourself) standartlarını tanımlar.

## Genel Bakış

Projede tekrarlanan UI pattern'leri tespit edilmiş ve aşağıdaki atomik bileşenler oluşturulmuştur:

1. **FormInput** - Standart form input bileşeni
2. **RmsSwitch** - Toggle/switch bileşeni
3. **AddIngredientModal** - Malzeme ekleme modalı
4. **FormSection** - Bölüm wrapper bileşeni
5. **formatNumericDisplay** - Sayısal değer formatlama fonksiyonu

---

## 1. FormInput Bileşeni

### Kural Tanımı

Tüm form input'ları (text, number, textarea, select) `FormInput` bileşeni kullanılarak oluşturulmalıdır. Bu bileşen:
- Standart label stilizasyonunu barındırır
- Error state yönetimini sağlar
- focus-visible kurallarını uygular
- Farklı input tiplerini destekler

### Konum

```
web/modules/shared/components/FormInput.tsx
```

### Interface Tanımı

```typescript
type InputType = 'text' | 'number' | 'email' | 'password' | 'tel';

interface FormInputProps {
  // Core props
  id: string;
  name: string;
  type?: InputType;
  value: string | number;
  onChange: (value: string) => void;
  
  // Label & display
  label: string;
  placeholder?: string;
  required?: boolean;
  
  // Styling variants
  inputMode?: 'text' | 'decimal' | 'numeric';
  textAlign?: 'left' | 'right';
  fontSize?: 'base' | 'lg' | 'xl';
  
  // Validation
  error?: string;
  
  // Select specific
  options?: Array<{ value: string; label: string }>;
  isSelect?: boolean;
  
  // Textarea specific
  isTextarea?: boolean;
  rows?: number;
  
  // File input
  isFile?: boolean;
  accept?: string;
  fileRef?: React.RefObject<HTMLInputElement>;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove?: () => void;
  previewUrl?: string | null;
  
  // ClassName override
  className?: string;
  
  // Disabled
  disabled?: boolean;
}
```

### Örnek Kullanım

```typescript
// Text input
<FormInput
  id="productName"
  name="name"
  label="Ürün Adı"
  value={formData.name}
  onChange={(value) => setFormData({ ...formData, name: value })}
  placeholder="ÖRN: IZGARA KÖFTE"
  required
  error={errors.name}
/>

// Number input
<FormInput
  id="price"
  name="price"
  type="number"
  label="NET SATIŞ FİYATI (₺)"
  value={formData.price}
  onChange={(value) => setFormData({ ...formData, price: value })}
  placeholder="0,00"
  required
  inputMode="decimal"
  textAlign="right"
  fontSize="xl"
/>

// Select input
<FormInput
  id="category"
  name="category_id"
  label="Ürün Kategorisi"
  value={formData.category_id}
  onChange={(value) => setFormData({ ...formData, category_id: value })}
  options={categories.map(c => ({ value: c.id, label: c.name }))}
  isSelect
  required
/>

// Textarea
<FormInput
  id="description"
  name="description"
  label="Ürün Açıklaması"
  value={formData.description}
  onChange={(value) => setFormData({ ...formData, description: value })}
  placeholder="ÜRÜN İÇERİĞİ VE DETAYLAR..."
  isTextarea
  rows={3}
/>
```

### Yapılması Gereken Refactoring

**ÖNCE** (ProductGeneralInfo.tsx - line 65-76):
```typescript
<div className="space-y-2">
  <label className="text-[10px] font-semibold text-text-primary uppercase tracking-widest ml-0.5">
    Ürün Adı
  </label>
  <input
    type="text"
    required
    className="w-full bg-bg-app border border-border-light px-4 py-3 text-base font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-1 rounded-sm transition-all placeholder:text-text-muted/40"
    placeholder="ÖRN: IZGARA KÖFTE"
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  />
</div>
```

**SONRA**:
```typescript
<FormInput
  id="productName"
  name="name"
  label="Ürün Adı"
  value={formData.name}
  onChange={(value) => setFormData({ ...formData, name: value })}
  placeholder="ÖRN: IZGARA KÖFTE"
  required
/>
```

---

## 2. RmsSwitch Bileşeni

### Kural Tanımı

Tüm toggle/switch UI elemanları `RmsSwitch` bileşeni kullanılarak oluşturulmalıdır. Bu bileşen:
- Standart toggle/styling sağlar
- Aktif/Pasif durumlarını yönetir
- Etiket gösterimi sağlar
- Farklı renk temalarını destekler

### Konum

```
web/modules/shared/components/RmsSwitch.tsx
```

### Interface Tanımı

```typescript
type SwitchTheme = 'success' | 'info' | 'warning' | 'danger' | 'primary';

interface RmsSwitchProps {
  // Core props
  checked: boolean;
  onChange: (checked: boolean) => void;
  
  // Display
  label?: string;
  labelOn?: string;    // Aktif durumda gösterilecek etiket (örn: "AKTİF")
  labelOff?: string;  // Pasif durumda gösterilecek etiket (örn: "PASİF")
  
  // Styling
  theme?: SwitchTheme;
  size?: 'sm' | 'md' | 'lg';
  
  // Behavior
  disabled?: boolean;
  readOnly?: boolean;
  
  // Container styling
  containerClassName?: string;
}
```

### Örnek Kullanım

```typescript
// Temel kullanım
<RmsSwitch
  checked={formData.is_available}
  onChange={(checked) => setFormData({ ...formData, is_available: checked })}
  label="Satış Durumu"
  labelOn="AKTİF"
  labelOff="PASİF"
  theme="success"
/>

// Stok takibi için
<RmsSwitch
  checked={formData.track_inventory}
  onChange={(checked) => setFormData({ ...formData, track_inventory: checked })}
  label="Stok Takibi"
  labelOn="EVET"
  labelOff="HAYIR"
  theme="info"
/>

// Boyut seçenekleri
<RmsSwitch
  checked={value}
  onChange={setValue}
  size="sm"  // Küçük: w-8 h-4, top: 0.5
  size="md" // Orta: w-10 h-5, top: 1 (varsayılan)
  size="lg" // Büyük: w-12 h-6, top: 1.5
/>
```

### CSS Özellikleri

```typescript
// Switch boyutları
const sizes = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3 translate-x-4',
    container: 'py-1 px-2'
  },
  md: {
    track: 'w-10 h-5', 
    thumb: 'w-3 h-3 translate-x-5',
    container: 'py-2 px-3'
  },
  lg: {
    track: 'w-12 h-6',
    thumb: 'w-4 h-4 translate-x-6',
    container: 'py-2 px-4'
  }
};

// Tema renkleri
const themes = {
  success: { active: 'bg-success-main', inactive: 'bg-bg-muted' },
  info: { active: 'bg-info-main', inactive: 'bg-bg-muted' },
  warning: { active: 'bg-warning-main', inactive: 'bg-bg-muted' },
  danger: { active: 'bg-danger-main', inactive: 'bg-bg-muted' },
  primary: { active: 'bg-primary-main', inactive: 'bg-bg-muted' }
};
```

---

## 3. AddIngredientModal Bileşeni

### Kural Tanımı

Malzeme ekleme modalı RecipeManager.tsx içinden çıkarılarak bağımsız bir bileşen haline getirilmelidir. Bu modal:
- Yeni malzeme oluşturma formunu barındırır
- Birim seçimi sağlar
- Kritik seviye girişi sunar
- API entegrasyonunu yönetir

### Konum

```
web/modules/shared/components/AddIngredientModal.tsx
```

### Interface Tanımı

```typescript
interface AddIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (ingredientId: string) => void;
  restaurantId: string;
  initialName?: string;  // Önceden doldurulmuş malzeme adı
  
  // Loading state externally controlled
  isLoading?: boolean;
  onSubmit?: (data: CreateIngredientData) => Promise<void>;
}

interface CreateIngredientData {
  name: string;
  unit: string;
  critical_level?: number;
  restaurant_id: string;
}
```

### Örnek Kullanım

```typescript
import { AddIngredientModal } from '@/modules/shared/components/AddIngredientModal';

// RecipeManager içinde
const [showModal, setShowModal] = useState(false);
const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number | null>(null);

<AddIngredientModal
  isOpen={showModal}
  onClose={() => {
    setShowModal(false);
    setSelectedRecipeIndex(null);
  }}
  onSuccess={(ingredientId) => {
    if (selectedRecipeIndex !== null) {
      updateRecipeItem(selectedRecipeIndex, 'ingredient_id', ingredientId);
    }
  }}
  restaurantId={restaurantId}
/>

// SearchableSelect ile birlikte kullanım
<SearchableSelect
  // ... props
  showAddNew={true}
  onAddNew={(name) => {
    setSelectedRecipeIndex(index);
    setShowModal(true);
  }}
/>
```

### İç Yapı

Modal şu alanları içermelidir:
1. **Malzeme Adı** - Text input, zorunlu
2. **Birim** - Select (adet, kg, gr, lt, ml, paket, kutu, şişe)
3. **Kritik Seviye** - Number input, opsiyonel
4. **İptal/Onay** butonları

---

## 4. FormSection Wrapper Bileşeni

### Kural Tanımı

Tüm form bölüm başlıkları (section headers) `FormSection` bileşeni kullanılarak oluşturulmalıdır. Bu bileşen:
- Standart başlık stilizasyonunu sağlar
- Renk varyantlarını destekler
- İçerik wrapper'ı sunar
- Eylem butonları ekleme imkanı verir

### Konum

```
web/modules/shared/components/FormSection.tsx
```

### Interface Tanımı

```typescript
type SectionVariant = 'primary' | 'success' | 'info' | 'warning' | 'danger';

interface FormSectionProps {
  // Header
  title: string;
  variant?: SectionVariant;
  
  // Actions (opsiyonel sağ taraf butonları)
  actions?: React.ReactNode;
  
  // Content
  children: React.ReactNode;
  
  // Layout
  className?: string;
  contentClassName?: string;
  gridClassName?: string;  // İ grid sçerik içinınıfları
  
  // Styling
  showDivider?: boolean;
  dividerClassName?: string;
}
```

### Örnek Kullanım

```typescript
// Temel kullanım
<FormSection title="TEMEL ÜRÜN BİLGİLERİ" variant="primary">
  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
    {/* Form alanları */}
  </div>
</FormSection>

// Eylem butonları ile
<FormSection 
  title="REÇETE YÖNETİMİ" 
  variant="info"
  actions={
    <button onClick={addRecipeItem} className="...">
      <PlusCircle size={14} />
      YENİ MALZEME
    </button>
  }
>
  {/* Recipe items */}
</FormSection>

// Fiyat bölümü için (sağ kenar)
<FormSection 
  title="FİYAT VE DURUM" 
  variant="success"
  className="border-r pr-6"
>
  <div className="space-y-4">
    {/* Price ve toggle'lar */}
  </div>
</FormSection>
```

### CSS Özellikleri

```typescript
// Başlık renk varyantları
const variants = {
  primary: 'bg-primary-main',
  success: 'bg-success-main',
  info: 'bg-info-main',
  warning: 'bg-warning-main',
  danger: 'bg-danger-main'
};

// Standart yapı
// <div className="border-b border-border-light pb-8">
//   {/* Header */}
//   <div className="flex items-center justify-between mb-4">
//     <div className="flex items-center gap-2">
//       <div className={`w-1.5 h-4 ${variantColor} rounded-full`} />
//       <h2 className="text-sm font-black text-text-primary uppercase tracking-[0.15em]">
//         {title}
//       </h2>
//     </div>
//     {actions && <div>{actions}</div>}
//   </div>
//   {/* Content */}
//   {children}
// </div>
```

---

## 5. formatNumericDisplay Tutarlılık Kuralları

### Kural Tanımı

Tüm sayısal değer gösterimleri ve girişleri `formatNumericDisplay` fonksiyonu kullanılarak tutarlı şekilde yönetilmelidir.

### Konum

```
web/modules/shared/utils/numeric.ts
```

### Fonksiyon Tanımı

```typescript
/**
 * Görüntüleme için sayısal değeri formatlar
 * - Ondalık ayracı olarak virgül kullanır
 * - Binlik ayracı KULLANMAZ (input alanları için)
 * - 0,00 formatında gösterir
 */
export function formatNumericDisplay(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') return '';
  
  let num: number;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    num = parseFloat(cleaned);
  } else {
    num = Number(value);
  }
  
  if (isNaN(num)) return '';
  
  if (num === Math.floor(num)) {
    return Math.floor(num).toString();
  }
  return num.toFixed(2).replace('.', ',');
}

/**
 * Input'tan gelen değeri sayıya çevirir
 * - Nokta ve virgülü normalize eder
 */
export function handleNumericInput(value: string): string {
  return value.replace(/\./g, '').replace(',', '.');
}

/**
 * Türkçe para birimi formatında gösterir
 */
export function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '0,00 ₺';
  return value.toLocaleString('tr-TR', { 
    style: 'currency', 
    currency: 'TRY' 
  });
}
```

### Kullanım Kuralları

**DO** - Tutarlı formatlama kullan:
```typescript
import { formatNumericDisplay, formatCurrency } from '@/modules/shared/utils/numeric';

// Giriş alanında
<input
  value={formatNumericDisplay(recipe.quantity)}
  onChange={(e) => updateRecipeItem(index, 'quantity', handleNumericInput(e.target.value))}
/>

// Görüntülemede
<span className="text-lg font-black">
  {formatCurrency(product.price)}
</span>
```

**DO NOT** - Farklı formatlama yöntemleri kullanma:
```typescript
// YANLIŞ - Farklı formatlar
<span>{product.price?.toLocaleString('tr-TR')}</span>
<span>₺{product.price}</span>
<span>{product.price.toFixed(2)}</span>
```

### Entegrasyon Noktaları

| Bileşen | Kullanım | Yapılacak Değişiklik |
|---------|----------|---------------------|
| ProductCard.tsx | Fiyat gösterimi (line 126) | `formatCurrency` kullan |
| ProductPricing.tsx | Fiyat girişi (line 50-58) | `formatNumericDisplay` kullan |
| RecipeManager.tsx | Miktar girişi (line 196-205) | `formatNumericDisplay` kullan |

---

## Refactoring Adımları

### 1. FormInput Entegrasyonu

**Etkilenen Dosyalar:**
- `web/modules/products/components/ProductGeneralInfo.tsx`
- `web/modules/products/components/ProductPricing.tsx`

**Adımlar:**
1. `FormInput.tsx` bileşenini oluştur
2. `ProductGeneralInfo.tsx` içindeki tüm input'ları `FormInput` ile değiştir
3. `ProductPricing.tsx` içindeki fiyat input'unu `FormInput` ile değiştir
4. Test et ve doğrula

### 2. RmsSwitch Entegrasyonu

**Etkilenen Dosyalar:**
- `web/modules/products/components/ProductPricing.tsx`

**Adımlar:**
1. `RmsSwitch.tsx` bileşenini oluştur
2. `ProductPricing.tsx` içindeki toggle'ları `RmsSwitch` ile değiştir
3. Test et ve doğrula

### 3. AddIngredientModal Entegrasyonu

**Etkilenen Dosyalar:**
- `web/modules/products/components/RecipeManager.tsx`

**Adımlar:**
1. `AddIngredientModal.tsx` bileşenini oluştur
2. RecipeManager'daki modal mantığını bu bileşene taşı
3. RecipeManager'da bu bileşeni import et ve kullan
4. Test et ve doğrula

### 4. FormSection Entegrasyonu

**Etkilenen Dosyalar:**
- `web/modules/products/components/ProductGeneralInfo.tsx`
- `web/modules/products/components/ProductPricing.tsx`
- `web/modules/products/components/RecipeManager.tsx`

**Adımlar:**
1. `FormSection.tsx` bileşenini oluştur
2. Tüm section header'ları `FormSection` ile sarmala
3. Tutarlılığı doğrula

### 5. formatNumericDisplay Tutarlılığı

**Etkilenen Dosyalar:**
- `web/modules/products/components/ProductCard.tsx`
- `web/modules/products/components/ProductPricing.tsx`
- `web/modules/products/components/RecipeManager.tsx`

**Adımlar:**
1. `numeric.ts` utility dosyasını oluştur
2. `formatCurrency` ve `handleNumericInput` fonksiyonlarını ekle
3. Tüm fiyat gösterimlerini `formatCurrency` ile güncelle
4. Tüm miktar girişlerini `handleNumericInput` ile güncelle

---

## Dosya Yapısı (Son Durum)

```
web/modules/shared/
├── components/
│   ├── FormInput.tsx       # YENİ - Standart form input
│   ├── RmsSwitch.tsx       # YENİ - Toggle/switch bileşeni
│   ├── AddIngredientModal.tsx  # YENİ - Malzeme ekleme modalı
│   ├── FormSection.tsx     # YENİ - Bölüm wrapper
│   ├── Input.tsx           # MEVCUT - Temel input (kullanım dışı kalabilir)
│   ├── Button.tsx
│   ├── Modal.tsx
│   └── ...
├── utils/
│   ├── numeric.ts          # YENİ - Sayısal formatlama fonksiyonları
│   └── ...
└── ...
```

---

## Sonuç

Bu kurallar uygulandığında:

1. **Kod Tekrarı Azalır** - Aynı UI pattern'leri tek bir yerde tanımlanır
2. **Bakım Kolaylığı** - Bir değişiklik tüm kullanım yerlerini etkiler
3. **Tutarlılık** - Tüm formlar aynı görünüm ve davranışa sahip olur
4. **Test Edilebilirlik** - Merkezi bileşenler ayrı ayrı test edilebilir
5. **Geliştirme Hızı** - Yeni formlar hızlıca oluşturulabilir
