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

export interface Ingredient extends BaseEntity {
    name: string
    unit: string
    restaurant_id: string
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
