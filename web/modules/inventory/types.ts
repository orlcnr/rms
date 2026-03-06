import { BaseEntity } from '@/modules/shared/types'

export enum MovementType {
    IN = 'IN',
    OUT = 'OUT',
    ADJUST = 'ADJUST',
}

export enum StockStatus {
    ALL = 'ALL',
    CRITICAL = 'CRITICAL',
    OUT_OF_STOCK = 'OUT_OF_STOCK',
    HEALTHY = 'HEALTHY',
}

export enum InventoryView {
    LIST = 'list',
    MOVEMENTS = 'movements',
    ANALYSIS = 'analysis',
}

export enum InventoryAnalysisTab {
    OVERVIEW = 'overview',
    COUNT_DIFF = 'count-diff',
}

export enum InventoryMovementTypeFilter {
    ALL = 'ALL',
}

export interface Ingredient extends BaseEntity {
    name: string
    unit: string
    restaurant_id?: string
    brand_id?: string
    base_unit?: string
    unit_group?: string
    pack_size?: number
    critical_level: number
    stock?: Stock
    // Maliyet alanları
    average_cost?: number    // Ortalama maliyet (₺)
    last_price?: number      // Son alış fiyatı (₺)
    // Fiyat geçmişi takibi
    previous_price?: number  // Önceki fiyat (₺)
    price_updated_at?: string // Fiyat güncelleme tarihi
}

export interface Stock extends BaseEntity {
    quantity: number
    ingredient_id: string
    ingredient?: Ingredient
}

export interface BranchStock extends BaseEntity {
    quantity: number
    ingredient_id: string
    branch_id: string
    ingredient?: Ingredient
}

export interface StockMovement extends BaseEntity {
    type: MovementType
    quantity: number
    reason: string
    ingredient_id: string
    ingredient?: Ingredient
    // Maliyet alanları (opsiyonel)
    unit_price?: number       // Birim fiyat (giriş hareketlerinde)
    supplier_id?: string      // Tedarikçi ID (giriş hareketlerinde)
}

export interface GetIngredientsDto {
    page?: number
    limit?: number
    name?: string
    status?: StockStatus
}

export interface GetStockMovementsDto {
    page?: number
    limit?: number
    ingredientName?: string
    startDate?: string
    endDate?: string
    type?: MovementType
}

export interface SelectOption<T = string> {
    value: T
    label: string
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

// Hızlı Sayım Modu için
export interface BulkStockUpdate {
    ingredientId: string
    newQuantity: number
}

// ============================================
// MALİYET ANALİZ TİPLERİ
// ============================================

/** Malzemenin kullanıldığı ürünler */
export interface IngredientUsage {
    ingredient: {
        id: string
        name: string
        unit: string
    }
    products: Array<{
        product_id: string
        product_name: string
        quantity: number
        product_price: number
    }>
    total_products_affected: number
}

/** Maliyet etkisi bilgisi */
export interface CostImpact {
    ingredient_id: string
    ingredient_name: string
    unit: string
    previous_price: number
    current_price: number
    price_change: number
    price_change_percent: number
    monthly_consumption: number
    cost_impact: number
}

/** Sayım farkı bilgisi */
export interface CountDifference {
    ingredient_id: string
    ingredient_name: string
    count_date: string
    system_quantity: number
    counted_quantity: number
    difference_quantity: number
    difference_try: number
    unit: string
}

/** Food Cost uyarısı */
export interface FoodCostAlert {
    product_id: string
    product_name: string
    current_price: number
    recipe_cost: number
    food_cost_percent: number
    suggested_price: number
}

/** Maliyet analizi özeti */
export interface CostAnalysisSummary {
    price_increases: CostImpact[]
    food_cost_alerts: FoodCostAlert[]
}

export interface InventorySummary {
    criticalStockCount: number
}

// ============================================
// API REQUEST PAYLOADS (Transport Layer)
// ============================================

export interface CreateIngredientPayload {
    name: string
    unit: string
    pack_size?: number
    critical_level: number
    transaction_id: string
}

export interface UpdateIngredientPayload extends Partial<CreateIngredientPayload> {
    transaction_id: string
}

export interface CreateStockMovementPayload {
    type: MovementType
    quantity: number
    reason: string
    ingredient_id: string
    unit?: string
    unit_price?: number
    supplier_id?: string
    transaction_id: string
}

export interface BulkStockUpdatePayload {
    updates: BulkStockUpdate[]
    transaction_id: string
}

export interface BulkUpdateStockResponse {
    updated: Array<{
        ingredientId: string
        newQty: number
    }>
    failed: Array<{
        ingredientId: string
        reason: string
    }>
}

export const INVENTORY_LABELS = {
    title: 'ENVANTER YÖNETİMİ',
    subtitle: 'Stok Takibi ve Malzeme Hareketleri',
    newIngredient: 'YENİ MALZEME',
    listSearchPlaceholder: 'MALZEME ADI İLE ARA...',
    movementSearchPlaceholder: 'MALZEME ADI İLE ARA...',
    movementHistory: 'Hareket Geçmişi',
    movementStartDate: 'BAŞLANGIÇ TARİHİ',
    movementEndDate: 'BİTİŞ TARİHİ',
    resetFilters: 'Filtreleri Sıfırla',
    syncingOverlay: 'Stoklar Senkronize Ediliyor...',
    editIngredientModalTitle: 'MALZEME DÜZENLE',
    createIngredientModalTitle: 'YENİ MALZEME EKLE',
    movementModalSuffix: ' - STOK HAREKETİ',
    analysisOverview: 'Genel Bakış',
    analysisCountDiff: 'Sayım Farkları',
} as const

export const INVENTORY_VIEW_OPTIONS: Array<{ id: InventoryView; label: string }> = [
    { id: InventoryView.LIST, label: 'STOK' },
    { id: InventoryView.MOVEMENTS, label: 'HAREKETLER' },
    { id: InventoryView.ANALYSIS, label: 'MALİYET ANALİZİ' },
]

export const INVENTORY_ANALYSIS_TAB_OPTIONS: Array<{
    id: InventoryAnalysisTab
    label: string
}> = [
        { id: InventoryAnalysisTab.OVERVIEW, label: INVENTORY_LABELS.analysisOverview },
        { id: InventoryAnalysisTab.COUNT_DIFF, label: INVENTORY_LABELS.analysisCountDiff },
    ]

export const INVENTORY_STOCK_STATUS_OPTIONS: SelectOption<StockStatus>[] = [
    { value: StockStatus.ALL, label: 'TÜMÜ' },
    { value: StockStatus.CRITICAL, label: 'KRITİK' },
    { value: StockStatus.OUT_OF_STOCK, label: 'STOK YOK' },
    { value: StockStatus.HEALTHY, label: 'NORMAL' },
]

export const INVENTORY_MOVEMENT_TYPE_OPTIONS: SelectOption<
    InventoryMovementTypeFilter | MovementType
>[] = [
        { value: InventoryMovementTypeFilter.ALL, label: 'TÜM TİPLER' },
        { value: MovementType.IN, label: 'GİRİŞ' },
        { value: MovementType.OUT, label: 'ÇIKIŞ' },
        { value: MovementType.ADJUST, label: 'DÜZELTME' },
    ]

export const INVENTORY_MESSAGES = {
    movementDateInvalidRange: 'Bitiş tarihi başlangıç tarihinden önce olamaz.',
    movementDateMaxRange: 'Tarih aralığı en fazla 1 ay (31 gün) olabilir.',
    ingredientsLoadFailed: 'Malzemeler yüklenemedi.',
    movementsLoadFailed: 'Hareket geçmişi yüklenemedi.',
    analysisLoadFailed: 'Analiz verileri yüklenemedi.',
    ingredientCreated: 'Yeni malzeme eklendi.',
    ingredientCreateFailed: 'Malzeme eklenemedi.',
    ingredientUpdated: 'Malzeme güncellendi.',
    ingredientUpdateFailed: 'Güncelleme başarısız.',
    ingredientDeleted: 'Malzeme silindi.',
    ingredientDeleteFailed: 'Silme işlemi başarısız.',
    movementAdded: 'Stok hareketi kaydedildi.',
    movementAddFailed: 'Hareket kaydedilemedi.',
    bulkUpdated: 'Stoklar toplu olarak güncellendi.',
    bulkUpdateFailed: 'Toplu güncelleme başarısız.',
} as const

export function toLocalDateString(isoValue?: string): string | undefined {
    if (!isoValue) return undefined

    const date = new Date(isoValue)
    if (isNaN(date.getTime())) return undefined

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function buildMovementDateQuery(rawDate?: string): string | undefined {
    const datePart = toLocalDateString(rawDate)
    if (!datePart) return undefined

    const [year, month, day] = datePart.split('-')
    if (!year || !month || !day) return undefined
    return `${year}-${month}-${day}`
}

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================

/** Birim dönüştürme fonksiyonları */
export function convertQuantity(
    value: number,
    fromUnit: string,
    toUnit: string
): number {
    // Gr -> Kg
    if (fromUnit === 'gr' && toUnit === 'kg') return value / 1000
    // Kg -> Gr
    if (fromUnit === 'kg' && toUnit === 'gr') return value * 1000
    // Lt -> Ml
    if (fromUnit === 'lt' && toUnit === 'ml') return value * 1000
    // Ml -> Lt
    if (fromUnit === 'ml' && toUnit === 'lt') return value / 1000

    return value
}

/** Food Cost hesaplama */
export function calculateFoodCost(recipeCost: number, productPrice: number): number {
    if (productPrice === 0) return 0
    return (recipeCost / productPrice) * 100
}

/** Türkçe para birimi formatında gösterir */
export function formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '0,00 ₺'
    return value.toLocaleString('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    })
}
