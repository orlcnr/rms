import { BaseEntity } from '@/modules/shared/types'
import { handleNumericInput as sharedHandleNumericInput, formatNumericDisplay as sharedFormatNumericDisplay } from '@/modules/shared/utils/numeric'

// ============================================
// CONSTANTS & OPTIONS (DRY - Merkezi Yönetim)
// ============================================

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

// Re-export from shared utility for backward compatibility
export const handleNumericInput = sharedHandleNumericInput;
export const formatNumericDisplay = sharedFormatNumericDisplay;

// Default form values
export const DEFAULT_FORM_DATA = {
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_available: true,
    track_inventory: false,
} as const;

// Form field labels
export const FORM_LABELS = {
    productName: 'Ürün Adı',
    productNamePlaceholder: 'ÖRN: IZGARA KÖFTE',
    description: 'Açıklama',
    descriptionPlaceholder: 'Ürün açıklaması...',
    price: 'Fiyat',
    pricePlaceholder: '0,00',
    category: 'Kategori',
    categoryPlaceholder: 'Seçiniz',
    available: 'Satışta',
    trackInventory: 'Stok Takibi',
    recipes: 'Reçete / Malzeme Listesi',
    addIngredient: 'Malzeme Ekle',
    ingredientName: 'Malzeme Adı',
    quantity: 'Miktar',
    unit: 'Birim',
    criticalLevel: 'Kritik Seviye',
    save: 'Kaydet',
    cancel: 'İptal',
    saving: 'Kaydediliyor...',
    addNewIngredient: 'Yeni Malzeme Ekle',
} as const;

// ============================================
// TYPES
// ============================================

export interface Category extends BaseEntity {
    name: string
    description?: string
    restaurant_id: string
    items?: MenuItem[]
}

// In the new modular structure, we'll keep it simple for now and use the existing types
export interface MenuItem extends BaseEntity {
    name: string
    description?: string
    price: number
    image_url?: string
    is_available: boolean
    track_inventory: boolean
    category_id: string
    category?: Category
    recipes?: RecipeItem[]
}

export interface RecipeItem extends BaseEntity {
    menu_item_id: string
    ingredient_id: string
    quantity: number
    ingredient?: {
        name: string
        unit: string
    }
}

export interface CreateCategoryInput {
    name: string
    description?: string
    restaurant_id: string
}

export interface CreateMenuItemInput {
    name: string
    description?: string
    price: number
    image_url?: string
    is_available?: boolean
    track_inventory?: boolean
    category_id: string
    total_cost?: number  // Toplam reçete maliyeti
    recipes?: Array<{
        ingredient_id: string
        quantity: number
    }>
}

export interface PaginatedResponse<T> {
    items: T[]
    meta: {
        totalItems: number
        itemCount: number
        itemsPerPage: number
        totalPages: number
        currentPage: number
    }
}

// ============================================
// FILTER TYPES
// ============================================

export type StockStatus = 'all' | 'in_stock' | 'out_of_stock' | 'critical'
export type SalesStatus = 'all' | 'active' | 'inactive'

export interface ProductFilters {
    search?: string
    categoryId?: string
    stockStatus?: StockStatus
    salesStatus?: SalesStatus
    minPrice?: number
    maxPrice?: number
}

export const FILTER_OPTIONS = {
    stockStatus: [
        { value: 'all', label: 'Tümü' },
        { value: 'in_stock', label: 'Var' },
        { value: 'out_of_stock', label: 'Yok' },
        { value: 'critical', label: 'Kritik' },
    ],
    salesStatus: [
        { value: 'all', label: 'Tümü' },
        { value: 'active', label: 'Aktif' },
        { value: 'inactive', label: 'Pasif' },
    ],
} as const;
