# ProductForm Refactoring Plan (DRY Prensibi)

## Mevcut Durum

**ProductForm.tsx**: 40,522 karakter (~800+ satır)
- Frontend kurallarına göre max 200 satır olmalı
- Acilen refactor edilmeli

## Hedef Yapı

```
web/modules/products/
├── types.ts                 # Mevcut - güncellenecek
├── constants/
│   └── product.constants.ts # YENİ - birimler, kategoriler
├── services/                # Mevcut
│   └── products.service.ts
├── hooks/                   # YENİ
│   └── useProductForm.ts    # Tüm business logic
└── components/
    ├── ProductForm.tsx      # SADECE layout (max 200 satır)
    ├── ProductBasicInfo.tsx # YENİ - temel bilgiler formu
    ├── ProductImage.tsx     # YENİ - resim yükleme
    ├── RecipeTable.tsx      # YENİ - reçete tablosu
    ├── IngredientSearch.tsx # YENİ - malzeme arama
    ├── AddIngredientModal.tsx # YENİ - yeni malzeme modal
    └── CategoryTabs.tsx     # Mevcut
    └── ProductCard.tsx      # Mevcut
```

## Refactoring Adımları

### 1. Constants Çıkarma (product.constants.ts)
```typescript
// Birimler ve diğer statik veriler
export const UNIT_OPTIONS = [
  { value: 'adet', label: 'Adet' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'gr', label: 'Gram' },
  { value: 'lt', label: 'Litre' },
  { value: 'ml', label: 'Mililitre' },
  { value: 'paket', label: 'Paket' },
  { value: 'kutu', label: 'Kutu' },
  { value: 'şişe', label: 'Şişe' },
] as const;

export type Unit = typeof UNIT_OPTIONS[number]['value'];
```

### 2. Custom Hook Oluşturma (useProductForm.ts)
```typescript
// Tüm state ve business logic burada
interface UseProductFormProps {
  initialData?: MenuItem;
  categories: Category[];
  ingredients: Ingredient[];
  restaurantId: string;
}

export function useProductForm({
  initialData,
  categories,
  ingredients,
  restaurantId
}: UseProductFormProps) {
  // State
  const [formData, setFormData] = useState(...)
  const [recipes, setRecipes] = useState(...)
  const [selectedFile, setSelectedFile] = useState(...)
  const [previewUrl, setPreviewUrl] = useState(...)
  const [newIngredients, setNewIngredients] = useState(...)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // API Calls
  const handleSubmit = async (file?: File) => {...}
  const handleDeleteIngredient = async (id: string) => {...}
  const handleCreateIngredient = async (data) => {...}

  // Computed
  const ingredientOptions = useMemo(...)

  return {
    // State
    formData, recipes, selectedFile, previewUrl,
    // Actions
    setFormData, setRecipes, setSelectedFile,
    // Computed
    ingredientOptions,
    // Submit
    handleSubmit,
  }
}
```

### 3. UI Bölümleri

#### ProductBasicInfo.tsx (~80 satır)
- Name, description, price, category select
- Shared Input/Button kullan

#### ProductImage.tsx (~50 satır)
- Image preview
- File input
- Remove button

#### RecipeTable.tsx (~100 satır)
- Table with ingredients
- Add/remove row
- Quantity input

#### IngredientSearch.tsx (~50 satır)
- SearchableSelect wrapper
- Add new ingredient callback

#### AddIngredientModal.tsx (~60 satır)
- Name, unit, critical_level inputs
- Submit/cancel buttons

### 4. Ana Form (ProductForm.tsx)
```typescript
// SADECE layout - max 200 satır
export function ProductForm(props) {
  const hook = useProductForm(props)

  return (
    <form onSubmit={hook.handleSubmit}>
      <ProductBasicInfo {...hook} />
      <ProductImage {...hook} />
      <RecipeTable {...hook} />
      <div className="flex gap-4">
        <Button type="submit">Kaydet</Button>
        <Button variant="ghost" onClick={props.onCancel}>İptal</Button>
      </div>
    </form>
  )
}
```

## Frontend Kurallarına Eklemeler

frontend-rules.md dosyasına eklenecek:

### 2.4 Custom Hook Kuralı

```typescript
// Complex form logic custom hook'a taşınmalı
// hooks/use[Feature].ts

// Kullanım
const {
  state,
  actions,
  computed
} = useProductForm(props)
```

### 2.5 Component Composition Kuralı

```
// Ana component (>200 satır) bölünmeli:
// 1. Layout component (composition)
// 2. Feature components (UI)
// 3. Custom hook (logic)
```

## Öncelik Sırası

1. **HIGH**: Constants çıkar (birimler)
2. **HIGH**: useProductForm hook oluştur
3. **HIGH**: ProductBasicInfo, ProductImage, RecipeTable ayır
4. **MEDIUM**: Ana formu layout'a çevir
5. **LOW**: Frontend rules güncelle

## Beklenen Sonuç

- ProductForm.tsx: ~150 satır (layout only)
- useProductForm.ts: ~200 satır (logic)
- Her alt component: ~50-100 satır
- Toplam: ~600 satır (önceki ~800'e göre %25 azalma + better organization)
