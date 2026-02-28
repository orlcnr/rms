// ============================================
// CASH MODULE TYPES
// Backend: backend/src/modules/cash/
// ============================================

import { BaseEntity } from '@/modules/shared/types';

// ============================================
// ENUMS
// ============================================

/**
 * Cash Session Status
 * Backend: backend/src/modules/cash/enums/cash.enum.ts
 */
export enum CashSessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

/**
 * Cash Movement Type
 * Backend: backend/src/modules/cash/enums/cash.enum.ts
 */
export enum CashMovementType {
  SALE = 'sale', // Satış (Ciro)
  IN = 'in', // Giriş (Nakit girişi, Bahşiş girişi)
  OUT = 'out', // Çıkış (Nakit çıkışı)
}

/**
 * Cash Movement Subtype
 * Detaylı hareket türü için
 */
export enum CashMovementSubtype {
  REGULAR = 'regular', // Normal satış
  TIP = 'tip', // Bahşiş
  REFUND = 'refund', // İade
  EXPENSE = 'expense', // Gider
  ADJUSTMENT = 'adjustment', // Düzeltme
}

/**
 * Payment Method
 * Backend: backend/src/modules/payments/entities/payment.entity.ts
 */
export enum CashPaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  DIGITAL_WALLET = 'digital_wallet',
  BANK_TRANSFER = 'bank_transfer',
  OPEN_ACCOUNT = 'open_account',
}

// ============================================
// INTERFACES
// ============================================

/**
 * Cash Register
 * Backend: backend/src/modules/cash/entities/cash-register.entity.ts
 */
export interface CashRegister extends BaseEntity {
  restaurantId: string
  name: string
  active: boolean
}

/**
 * Cash Session
 * Backend: backend/src/modules/cash/entities/cash-session.entity.ts
 */
export interface CashSession extends BaseEntity {
  cashRegisterId: string
  cashRegister?: CashRegister
  openedById: string
  openedBy?: {
    id: string
    first_name: string
    last_name: string
  }
  openedAt: string
  openingBalance: number
  closedById?: string
  closedBy?: {
    id: string
    first_name: string
    last_name: string
  }
  closedAt?: string
  closingBalance?: number
  countedBalance?: number
  difference?: number
  status: CashSessionStatus
  movements?: CashMovement[]

  // Ek bilgiler (hesaplanmış)
  totalCashTips?: number // Gün içinde nakit bahşiş
  totalCardTips?: number // Gün içinde kart bahşiş
}

/**
 * Cash Movement
 * Backend: backend/src/modules/cash/entities/cash-movement.entity.ts
 */
export interface CashMovement extends BaseEntity {
  cashSessionId: string
  type: CashMovementType
  subtype?: CashMovementSubtype
  paymentMethod: CashPaymentMethod
  amount: number
  description: string
  userId: string
  user?: {
    first_name: string
    last_name: string
  }
  orderId?: string

  // Frontend tarafından yönetilen alanlar
  isLiquid?: boolean // Likid mi? (nakit = true, kart = false)
  isRevenue?: boolean // Ciro mu? (tip için false olacak)
}

/**
 * Cash Register with Status
 * Backend: cash.service.ts -> getRegistersWithStatus returns {...reg, status, activeSession}
 */
export interface CashRegisterWithStatus extends CashRegister {
  status: 'open' | 'closed'
  activeSession: {
    id: string
    openedAt: string
    openedBy: any
    openingBalance: number
    currentBalance: number
  } | null
  // backward compatibility if needed, but we should fix components
  hasActiveSession?: boolean
}

/**
 * Active Session Wrapper
 * Backend: cash.service.ts -> getAllActiveSessions returns {register, session, currentBalance, netCashChange}
 */
export interface ActiveSessionWrapper {
  register: CashRegister
  session: CashSession
  currentBalance: number
  netCashChange: number
}

/**
 * Cash Session with Summary
 * Oturum özeti ile birlikte
 */
export interface CashSessionWithSummary extends CashSession {
  summary: CashSummaryData
}

/**
 * Cash Summary Data
 * Kasa özet bilgileri
 */
export interface CashSummaryData {
  netSales: number // Net Satış (Ciro)
  totalTips: number // Toplam Bahşiş
  totalCash: number // Kasa Toplamı (Nakit + Nakit Bahşiş)
  cashTips: number // Nakit Bahşiş
  cardTips: number // Kart Bahşiş
}

/**
 * Denomination Entry
 * Banknot sayımı için
 */
export interface DenominationEntry {
  denomination: number // 200, 100, 50, 20, 10, 5, 1, 0.5
  count: number
}

/**
 * Cash Close Data
 * Kasa kapatma için veri
 */
export interface CashCloseData {
  countedBalance: number // Personelin saydığı
  creditCardTotal: number // Kredi kartı slip toplamı
  denominations?: DenominationEntry[] // Banknot detayları
  notes?: string
  distributeCardTips?: boolean // Kart bahşişini kasadan dağıtacak mı?
  cardTipsToDistribute?: number // Dağıtılacak kart bahşişi
  transaction_id?: string
}

/**
 * Cash Open Data
 * Kasa açma için veri
 */
export interface CashOpenData {
  cashRegisterId: string
  openingBalance: number
  notes?: string
  transaction_id?: string
}

/**
 * Create Movement Data
 * Hareket oluşturma için veri
 */
export interface CreateMovementData {
  type: CashMovementType
  subtype?: CashMovementSubtype
  paymentMethod: CashPaymentMethod
  amount: number
  description?: string
  orderId?: string
  transaction_id?: string

  // Frontend tarafından belirlenen alanlar
  isLiquid: boolean
  isRevenue: boolean
}

// ============================================
// LABELS
// ============================================

export const CASH_SESSION_STATUS_LABELS: Record<CashSessionStatus, string> = {
  [CashSessionStatus.OPEN]: 'Açık',
  [CashSessionStatus.CLOSED]: 'Kapalı',
}

export const CASH_MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  [CashMovementType.SALE]: 'Satış',
  [CashMovementType.IN]: 'Giriş',
  [CashMovementType.OUT]: 'Çıkış',
}

export const CASH_MOVEMENT_SUBTYPE_LABELS: Record<CashMovementSubtype, string> = {
  [CashMovementSubtype.REGULAR]: 'Normal Satış',
  [CashMovementSubtype.TIP]: 'Bahşiş',
  [CashMovementSubtype.REFUND]: 'İade',
  [CashMovementSubtype.EXPENSE]: 'Gider',
  [CashMovementSubtype.ADJUSTMENT]: 'Düzeltme',
}

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_DENOMINATIONS: DenominationEntry[] = [
  { denomination: 200, count: 0 },
  { denomination: 100, count: 0 },
  { denomination: 50, count: 0 },
  { denomination: 20, count: 0 },
  { denomination: 10, count: 0 },
  { denomination: 5, count: 0 },
  { denomination: 1, count: 0 },
  { denomination: 0.5, count: 0 },
]
