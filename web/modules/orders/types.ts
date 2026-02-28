// ============================================
// ORDERS MODULE TYPES
// Backend: backend/src/modules/orders/entities/order.entity.ts
// ============================================

import { BaseEntity } from '@/modules/shared/types'

// ============================================
// ENUMS (Backend'den)
// ============================================

/**
 * Order Status Enum
 * Backend: backend/src/modules/orders/enums/order-status.enum.ts
 */
export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  PAID = 'paid',
  ON_WAY = 'on_way',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/**
 * Order Type Enum
 * Backend: backend/src/modules/orders/enums/order-type.enum.ts
 */
export enum OrderType {
  DINE_IN = 'dine_in',
  TAKEAWAY = 'takeaway',
  DELIVERY = 'delivery',
}

/**
 * Order Source Enum
 * Backend: backend/src/modules/orders/enums/order-source.enum.ts
 */
export enum OrderSource {
  INTERNAL = 'internal',
  YEMEK_SEPETI = 'yemek_sepeti',
  GETIR = 'getir',
  TRENDYOL = 'trendyol',
  MIGROS_YEMEK = 'migros_yemek',
}

/**
 * Payment Method Enum
 */
export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  DIGITAL_WALLET = 'digital_wallet',
  BANK_TRANSFER = 'bank_transfer',
  OPEN_ACCOUNT = 'open_account', // Açık Hesap / Cari
}

/**
 * Discount Type Enum - İskonto vs İkram ayrımı
 * Backend: backend/src/modules/payments/entities/payment.entity.ts
 */
export enum DiscountType {
  DISCOUNT = 'discount', // İskonto - toplamdan düşülür, gelir azalır
  COMPLIMENTARY = 'complimentary', // İkram - ayrı raporlanır
}

/**
 * Payment Status Enum
 */
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

// ============================================
// STATUS MAPPING & LABELS (Frontend)
// ============================================

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Beklemede',
  [OrderStatus.PREPARING]: 'Hazırlanıyor',
  [OrderStatus.READY]: 'Hazır',
  [OrderStatus.SERVED]: 'Servis Edildi',
  [OrderStatus.PAID]: 'Ödendi',
  [OrderStatus.ON_WAY]: 'Yolda',
  [OrderStatus.DELIVERED]: 'Teslim Edildi',
  [OrderStatus.CANCELLED]: 'İptal Edildi',
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  [OrderType.DINE_IN]: 'Yemek İçi',
  [OrderType.TAKEAWAY]: 'Paket Servis',
  [OrderType.DELIVERY]: 'Teslimat',
}

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  [OrderSource.INTERNAL]: 'Restoran',
  [OrderSource.YEMEK_SEPETI]: 'Yemek Sepeti',
  [OrderSource.GETIR]: 'Getir',
  [OrderSource.TRENDYOL]: 'Trendyol',
  [OrderSource.MIGROS_YEMEK]: 'Migros Yemek',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Nakit',
  [PaymentMethod.CREDIT_CARD]: 'Kredi Kartı',
  [PaymentMethod.DEBIT_CARD]: 'Banka Kartı',
  [PaymentMethod.DIGITAL_WALLET]: 'Dijital Cüzdan',
  [PaymentMethod.BANK_TRANSFER]: 'Havale/EFT',
  [PaymentMethod.OPEN_ACCOUNT]: 'Açık Hesap',
}

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  [DiscountType.DISCOUNT]: 'İskonto',
  [DiscountType.COMPLIMENTARY]: 'İkram',
}

// ============================================
// ORDER TYPES (Backend Response)
// ============================================

/**
 * Order Entity
 * Backend: backend/src/modules/orders/entities/order.entity.ts
 */
export interface Order extends BaseEntity {
  restaurantId: string
  tableId: string | null
  table?: {
    id: string
    name: string
    area?: string
  }
  userId: string | null
  user?: {
    id: string
    name: string
  }
  customerId: string | null
  customer?: {
    id: string
    first_name?: string
    last_name?: string
    name?: string // Fallback for old format
    phone?: string
    total_debt?: number // Toplam borç
    current_debt?: number // Mevcut borç
    credit_limit?: number // Kredi limiti
    credit_limit_enabled?: boolean // Limit kontrolü aktif mi
  }
  type: OrderType
  source: OrderSource
  status: OrderStatus
  totalAmount: number
  orderNumber: string | null
  notes: string | null
  items: OrderItem[]
  createdAt: string
  updatedAt?: string
}

/**
 * OrderItem Entity
 * Backend: backend/src/modules/orders/entities/order-item.entity.ts
 */
export interface OrderItem extends BaseEntity {
  orderId: string
  menuItemId: string
  menuItem?: {
    id: string
    name: string
    price: number
    image_url?: string
  }
  quantity: number
  unitPrice: number
  totalPrice: number
  status: OrderStatus
  notes?: string
}

// ============================================
// BASKET TYPES (Local State)
// ============================================

/**
 * Sepete eklenen ürün
 * Local state olarak tutulur, backend'e gönderilirken OrderItem formatına dönüştürülür
 */
export interface BasketItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes?: string
  image_url?: string
}

/**
 * Sepet State
 */
export interface BasketState {
  items: BasketItem[]
  tableId: string | null
  tableName?: string
  orderType: OrderType
}

/**
 * Sepet Toplam Hesaplama
 */
export interface BasketSummary {
  itemCount: number
  subtotal: number
  tax?: number
  total: number
}

// ============================================
// CREATE ORDER INPUT
// ============================================

export interface CreateOrderInput {
  restaurant_id: string
  transaction_id?: string
  table_id?: string
  customer_id?: string
  type: OrderType
  notes?: string
  items: Array<{
    menu_item_id: string
    quantity: number
    notes?: string
  }>
}

export interface UpdateOrderStatusInput {
  status: OrderStatus
  transaction_id?: string
}

export interface UpdateOrderItemsInput {
  transaction_id?: string
  items: Array<{
    menu_item_id: string  // Backend snake_case bekliyor
    quantity: number
    notes?: string
  }>
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface GetOrdersParams {
  page?: number
  limit?: number
  status?: OrderStatus
  type?: OrderType
  tableId?: string
  search?: string
  startDate?: string
  endDate?: string
}

export interface PaginatedOrdersResponse {
  items: Order[]
  meta: {
    totalItems: number
    itemCount: number
    itemsPerPage: number
    totalPages: number
    currentPage: number
  }
}

// ============================================
// CONSTANTS & OPTIONS (DRY)
// ============================================

export const ORDER_STATUS_OPTIONS = [
  { value: OrderStatus.PENDING, label: ORDER_STATUS_LABELS[OrderStatus.PENDING] },
  { value: OrderStatus.PREPARING, label: ORDER_STATUS_LABELS[OrderStatus.PREPARING] },
  { value: OrderStatus.READY, label: ORDER_STATUS_LABELS[OrderStatus.READY] },
  { value: OrderStatus.SERVED, label: ORDER_STATUS_LABELS[OrderStatus.SERVED] },
  { value: OrderStatus.PAID, label: ORDER_STATUS_LABELS[OrderStatus.PAID] },
  { value: OrderStatus.ON_WAY, label: ORDER_STATUS_LABELS[OrderStatus.ON_WAY] },
  { value: OrderStatus.DELIVERED, label: ORDER_STATUS_LABELS[OrderStatus.DELIVERED] },
  { value: OrderStatus.CANCELLED, label: ORDER_STATUS_LABELS[OrderStatus.CANCELLED] },
] as const

export const ORDER_TYPE_OPTIONS = [
  { value: OrderType.DINE_IN, label: ORDER_TYPE_LABELS[OrderType.DINE_IN] },
  { value: OrderType.TAKEAWAY, label: ORDER_TYPE_LABELS[OrderType.TAKEAWAY] },
  { value: OrderType.DELIVERY, label: ORDER_TYPE_LABELS[OrderType.DELIVERY] },
] as const

export const PAYMENT_METHOD_OPTIONS = [
  { value: PaymentMethod.CASH, label: PAYMENT_METHOD_LABELS[PaymentMethod.CASH] },
  { value: PaymentMethod.CREDIT_CARD, label: PAYMENT_METHOD_LABELS[PaymentMethod.CREDIT_CARD] },
  { value: PaymentMethod.DEBIT_CARD, label: PAYMENT_METHOD_LABELS[PaymentMethod.DEBIT_CARD] },
  { value: PaymentMethod.DIGITAL_WALLET, label: PAYMENT_METHOD_LABELS[PaymentMethod.DIGITAL_WALLET] },
  { value: PaymentMethod.BANK_TRANSFER, label: PAYMENT_METHOD_LABELS[PaymentMethod.BANK_TRANSFER] },
  { value: PaymentMethod.OPEN_ACCOUNT, label: PAYMENT_METHOD_LABELS[PaymentMethod.OPEN_ACCOUNT] },
] as const

export const DISCOUNT_TYPE_OPTIONS = [
  { value: DiscountType.DISCOUNT, label: DISCOUNT_TYPE_LABELS[DiscountType.DISCOUNT] },
  { value: DiscountType.COMPLIMENTARY, label: DISCOUNT_TYPE_LABELS[DiscountType.COMPLIMENTARY] },
] as const

// ============================================
// PAYMENT TYPES (Checkout/Ödeme)
// ============================================

/**
 * Single payment line in split payment
 * Backend: backend/src/modules/payments/dto/create-split-payment.dto.ts
 */
export interface PaymentLine {
  id: string // Frontend generated unique ID
  method: PaymentMethod
  amount: number // In cents for precision
  cashReceived?: number // For CASH payments
  customerId?: string // For OPEN_ACCOUNT
  tipAmount?: number // Gross tip (brüt bahşiş)
  commissionRate?: number // Commission percentage (e.g. 0.02)
}

/**
 * Discount/İkram application
 */
export interface Discount {
  type: DiscountType
  amount: number
  reason?: string // Required for accounting
}

/**
 * Split Payment Request - Parçalı ödeme isteği
 * Backend: backend/src/modules/payments/dto/create-split-payment.dto.ts
 */
export interface SplitPaymentRequest {
  order_id: string
  transaction_id?: string // UUID v4 for idempotency
  payments: Array<{
    amount: number
    payment_method: PaymentMethod
    customer_id?: string
    cash_received?: number
    tip_amount?: number
    commission_rate?: number
    notes?: string
  }>
  discount_type?: DiscountType
  discount_amount?: number
  discount_reason?: string
}

/**
 * Payment with full details from backend
 */
export interface Payment extends BaseEntity {
  order_id: string
  customer_id: string | null
  amount: number
  payment_method: PaymentMethod
  cash_received: number | null
  change_given: number | null
  discount_type: DiscountType | null
  discount_amount: number
  discount_reason: string | null
  tip_amount: number | null
  commission_rate: number | null
  net_tip_amount: number | null
  status: PaymentStatus
  transaction_id: string | null
  description: string | null
  created_at: string
}

/**
 * Payment revert request
 */
export interface RevertPaymentRequest {
  payment_id: string
  transaction_id?: string // UUID v4 for idempotency
  reason: string
  approved_by?: string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sepet toplamını hesapla
 */
export function calculateBasketSummary(items: BasketItem[]): BasketSummary {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return {
    itemCount,
    subtotal,
    total: subtotal, // TODO: Vergi hesaplaması eklenebilir
  }
}

/**
 * Sepete ürün ekle veya miktarını artır
 */
export function addToBasket(items: BasketItem[], newItem: Omit<BasketItem, 'quantity'>): BasketItem[] {
  const existing = items.find(item => item.menuItemId === newItem.menuItemId)

  if (existing) {
    return items.map(item =>
      item.menuItemId === newItem.menuItemId
        ? { ...item, quantity: item.quantity + 1 }
        : item
    )
  }

  return [...items, { ...newItem, quantity: 1 }]
}

/**
 * Sepetten ürün miktarını azalt
 */
export function decrementBasketItem(items: BasketItem[], menuItemId: string): BasketItem[] {
  const existing = items.find(item => item.menuItemId === menuItemId)

  if (!existing) return items

  if (existing.quantity <= 1) {
    return items.filter(item => item.menuItemId !== menuItemId)
  }

  return items.map(item =>
    item.menuItemId === menuItemId
      ? { ...item, quantity: item.quantity - 1 }
      : item
  )
}

/**
 * Sepetten ürünü tamamen kaldır
 */
export function removeFromBasket(items: BasketItem[], menuItemId: string): BasketItem[] {
  return items.filter(item => item.menuItemId !== menuItemId)
}

/**
 * Sepeti temizle
 */
export function clearBasket(): BasketItem[] {
  return []
}

// ============================================
// PAYMENT HELPER FUNCTIONS
// ============================================

/**
 * Convert amount to cents for precision (avoid floating point issues)
 * 100.50 TL -> 10050 (cents)
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Convert cents back to decimal
 * 10050 (cents) -> 100.50
 */
export function fromCents(cents: number): number {
  return cents / 100
}

/**
 * Calculate change for cash payment
 * @param cashReceived - Money given by customer
 * @param amount - Actual amount due
 * @returns Change to give back (0 if cashReceived < amount)
 */
export function calculateChange(cashReceived: number, amount: number): number {
  if (!cashReceived || cashReceived < amount) return 0
  return cashReceived - amount
}

/**
 * Calculate total paid from payment lines
 */
export function calculateTotalPaid(payments: PaymentLine[]): number {
  return payments.reduce((sum, p) => sum + (p.amount || 0), 0)
}

/**
 * Calculate remaining balance
 */
export function calculateRemaining(orderTotal: number, payments: PaymentLine[]): number {
  const paid = calculateTotalPaid(payments)
  return Math.max(0, orderTotal - paid)
}

/**
 * Check if payment is complete
 */
export function isPaymentComplete(orderTotal: number, payments: PaymentLine[]): boolean {
  return calculateRemaining(orderTotal, payments) <= 0
}

/**
 * Format amount with currency symbol
 */
export function formatPaymentAmount(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount)
}

/**
 * Get payment method icon name
 */
export function getPaymentMethodIcon(method: PaymentMethod): string {
  const icons: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Banknote',
    [PaymentMethod.CREDIT_CARD]: 'CreditCard',
    [PaymentMethod.DEBIT_CARD]: 'CreditCard',
    [PaymentMethod.DIGITAL_WALLET]: 'Smartphone',
    [PaymentMethod.BANK_TRANSFER]: 'Building',
    [PaymentMethod.OPEN_ACCOUNT]: 'User',
  }
  return icons[method] || 'DollarSign'
}

// ============================================
// KANBAN BOARD TYPES
// ============================================

/**
 * OrderRequest - Sipariş içindeki farklı istek/komut
 * Aynı masa grubunda farklı zamanlarda verilen siparişleri temsil eder
 */
export interface OrderRequest {
  id: string
  orderId: string
  note?: string
  requestedAt: string
  status: OrderStatus
  items: OrderItem[]
}

/**
 * OrderGroup - Bir masa/adresteki tüm siparişleri gruplar
 * Kanban board'da her kart bir OrderGroup'tur
 */
export interface OrderGroup {
  tableId: string
  tableName: string
  orders: Order[]
  requests?: OrderRequest[] // Farklı istekler dizisi
  totalItems: number
  totalAmount: number
  firstOrderTime: string
  lastOrderTime: string
  activeWaveTime: string // En son eklenen ürünün veya siparişin zamanı (sayaç için)
  customerName?: string
  orderType?: OrderType
  status: OrderStatus
  activeItems: OrderItem[] // Tüm aktif ürünler (eski+yeni birleşik - geriye dönük uyumluluk için)
  activeWaveItems: OrderItem[] // SADECE en son verilen siparişe (dalga) ait ürünler
  previousItems: OrderItem[] // En son siparişten önceki, henüz servis aşamasındaki ürünler
  servedItems: OrderItem[] // 30 dakikadan önce servis edilmiş olan ürünler (arşiv)
}

/**
 * OrdersByStatus - Status bazlı gruplanmış siparişler
 * Kanban board'daki her sütun için kullanılır
 */
export interface OrdersByStatus {
  pending: OrderGroup[]
  preparing: OrderGroup[]
  ready: OrderGroup[]
  served: OrderGroup[]
  on_way: OrderGroup[]
  delivered: OrderGroup[]
  paid: OrderGroup[]
  cancelled: OrderGroup[]
}

/**
 * Kanban Board Filters
 */
export interface BoardFilters {
  dateRange?: {
    start: string
    end: string
  }
  orderType?: OrderType
  tableId?: string
  search?: string
}

/**
 * Kanban sütun yapılandırması
 */
export interface KanbanColumnConfig {
  status: OrderStatus
  label: string
  color: string
  icon: string
}

/**
 * Dine-In Kanban columns
 */
export const KANBAN_COLUMNS_DINE_IN: KanbanColumnConfig[] = [
  { status: OrderStatus.PENDING, label: 'Yeni Siparişler', color: 'yellow', icon: 'Clock' },
  { status: OrderStatus.PREPARING, label: 'Hazırlanıyor', color: 'blue', icon: 'ChefHat' },
  { status: OrderStatus.READY, label: 'Hazır', color: 'green', icon: 'Check' },
  { status: OrderStatus.SERVED, label: 'Servis Edildi', color: 'purple', icon: 'Utensils' },
]

/**
 * Takeaway/Delivery Kanban columns
 */
export const KANBAN_COLUMNS_TAKEAWAY: KanbanColumnConfig[] = [
  { status: OrderStatus.PENDING, label: 'Beklemede', color: 'yellow', icon: 'Clock' },
  { status: OrderStatus.PREPARING, label: 'Hazırlanıyor', color: 'blue', icon: 'ChefHat' },
  { status: OrderStatus.READY, label: 'Hazır', color: 'green', icon: 'Check' },
  { status: OrderStatus.ON_WAY, label: 'Yolda', color: 'orange', icon: 'Truck' },
  { status: OrderStatus.DELIVERED, label: 'Teslim Edildi', color: 'green', icon: 'CheckCircle' },
]

/**
 * Completed columns
 */
export const KANBAN_COLUMNS_COMPLETED: KanbanColumnConfig[] = [
  { status: OrderStatus.PAID, label: 'Ödenmiş', color: 'green', icon: 'CreditCard' },
  { status: OrderStatus.CANCELLED, label: 'İptal', color: 'red', icon: 'XCircle' },
]

// ============================================
// STATUS HELPER FUNCTIONS
// ============================================

/**
 * Get next possible status options for a given status
 */
export function getNextStatusOptions(currentStatus: OrderStatus): OrderStatus[] {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.CANCELLED],
    [OrderStatus.SERVED]: [OrderStatus.PAID],
    [OrderStatus.PAID]: [],
    [OrderStatus.ON_WAY]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  }

  return validTransitions[currentStatus] || []
}

/**
 * Is order cancellable
 */
export function isOrderCancellable(status: OrderStatus): boolean {
  return [
    OrderStatus.PENDING,
    OrderStatus.PREPARING,
    OrderStatus.READY,
  ].includes(status)
}


/**
 * Layout constants for consistent spacing across POS components
 */
export const LAYOUT = {
  PADDING: {
    CONTAINER: 'p-6',
    PANEL: 'p-4',
    CARD: 'p-2',
  },
  GAP: {
    LARGE: 'gap-6',
    MEDIUM: 'gap-4',
    SMALL: 'gap-2',
  },
  WIDTH: {
    BASKET_PANEL: '360px',
    BASKET_PANEL_MD: '320px',
  },
  GRID: {
    COLUMNS: {
      MOBILE: 'grid-cols-2',
      TABLET: 'sm:grid-cols-2',
      DESKTOP: 'lg:grid-cols-3',
      XL: 'xl:grid-cols-4',
    },
  },
} as const
