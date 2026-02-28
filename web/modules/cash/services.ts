// ============================================
// CASH MODULE API SERVICES
// Backend: backend/src/modules/cash/cash.controller.ts
// ============================================

import { http } from '@/modules/shared/api/http'
import {
  CashRegister,
  CashSession,
  CashMovement,
  CashSessionStatus,
  CashMovementType,
  CashMovementSubtype,
  CashRegisterWithStatus,
  CashSummaryData,
  CreateMovementData,
  CashCloseData,
  CashOpenData,
  ActiveSessionWrapper,
} from './types'

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all cash registers for a restaurant
 * GET /cash/registers
 */
export const getRegisters = async (): Promise<CashRegister[]> => {
  return await http.get<CashRegister[]>('/cash/registers')
}

/**
 * Get cash registers with their current status
 * GET /cash/registers/with-status
 */
export const getRegistersWithStatus = async (): Promise<CashRegisterWithStatus[]> => {
  return await http.get<CashRegisterWithStatus[]>('/cash/registers/with-status')
}

/**
 * Get all active sessions across all registers
 * GET /cash/registers/active-sessions
 */
export const getActiveSessions = async (): Promise<ActiveSessionWrapper[]> => {
  return await http.get<ActiveSessionWrapper[]>('/cash/registers/active-sessions')
}

/**
 * Create a new cash register
 * POST /cash/registers
 */
export const createRegister = async (name: string): Promise<CashRegister> => {
  return await http.post<CashRegister>('/cash/registers', { name })
}

/**
 * Delete a cash register (soft delete)
 * DELETE /cash/registers/:registerId
 */
export const deleteRegister = async (registerId: string): Promise<void> => {
  return await http.delete<void>(`/cash/registers/${registerId}`)
}

/**
 * Ensure a default register exists
 * POST /cash/registers/ensure-default
 */
export const ensureDefaultRegister = async (): Promise<CashRegister> => {
  return await http.post<CashRegister>('/cash/registers/ensure-default', {})
}

/**
 * Get sessions for a specific register
 * GET /cash/registers/:registerId/sessions
 */
export const getSessions = async (registerId: string): Promise<CashSession[]> => {
  return await http.get<CashSession[]>(`/cash/registers/${registerId}/sessions`)
}

/**
 * Open a new cash session
 * POST /cash/sessions/open
 */
export const openSession = async (data: CashOpenData): Promise<CashSession> => {
  return await http.post<CashSession>('/cash/sessions/open', data)
}

/**
 * Close a cash session
 * POST /cash/sessions/:sessionId/close
 */
export const closeSession = async (
  sessionId: string,
  data: CashCloseData
): Promise<CashSession> => {
  return await http.post<CashSession>(`/cash/sessions/${sessionId}/close`, data)
}

/**
 * Get movements for a session
 * GET /cash/sessions/:sessionId/movements
 */
export const getMovements = async (sessionId: string): Promise<CashMovement[]> => {
  return await http.get<CashMovement[]>(`/cash/sessions/${sessionId}/movements`)
}

/**
 * Add a new movement to a session
 * POST /cash/sessions/:sessionId/movements
 */
export const addMovement = async (
  sessionId: string,
  data: CreateMovementData
): Promise<CashMovement> => {
  return await http.post<CashMovement>(`/cash/sessions/${sessionId}/movements`, data)
}

/**
 * Get session summary (sales, tips, etc.)
 * GET /cash/sessions/:sessionId/summary
 */
export const getSessionSummary = async (sessionId: string): Promise<CashSummaryData> => {
  return await http.get<CashSummaryData>(`/cash/sessions/${sessionId}/summary`)
}

/**
 * Get session history with filters
 * GET /cash/sessions/history
 */
export const getSessionHistory = async (filters?: {
  startDate?: string
  endDate?: string
  registerId?: string
  status?: CashSessionStatus
}): Promise<CashSession[]> => {
  const params = new URLSearchParams()
  if (filters?.startDate) params.append('startDate', filters.startDate)
  if (filters?.endDate) params.append('endDate', filters.endDate)
  if (filters?.registerId) params.append('registerId', filters.registerId)
  if (filters?.status) params.append('status', filters.status)

  const queryString = params.toString()
  return await http.get<CashSession[]>(
    queryString ? `/cash/sessions/history?${queryString}` : '/cash/sessions/history'
  )
}

// ============================================
// HELPER FUNCTIONS FOR PAYMENT INTEGRATION
// ============================================

/**
 * Create a sale movement from payment
 * Used in POS payment flow
 */
export const createSaleMovement = async (
  sessionId: string,
  orderId: string,
  amount: number,
  paymentMethod: string,
  isLiquid: boolean
): Promise<CashMovement> => {
  return await addMovement(sessionId, {
    type: CashMovementType.SALE,
    subtype: CashMovementSubtype.REGULAR,
    paymentMethod: paymentMethod as CashMovementSubtype extends string ? never : never,
    amount,
    description: `Sipariş #${orderId} Satış`,
    orderId,
    isLiquid,
    isRevenue: true, // Sale is revenue
  })
}

/**
 * Create a tip movement from payment
 * Used in POS payment flow
 */
export const createTipMovement = async (
  sessionId: string,
  orderId: string,
  tipAmount: number,
  paymentMethod: string,
  isLiquid: boolean
): Promise<CashMovement> => {
  return await addMovement(sessionId, {
    type: CashMovementType.IN,
    subtype: CashMovementSubtype.TIP,
    paymentMethod: paymentMethod as CashMovementSubtype extends string ? never : never,
    amount: tipAmount,
    description: `Sipariş #${orderId} Bahşiş`,
    orderId,
    isLiquid,
    isRevenue: false, // Tip is NOT revenue (it's a liability)
  })
}

// ============================================
// CASH API OBJECT
// ============================================

export const cashApi = {
  // Registers
  getRegisters,
  getRegistersWithStatus,
  getActiveSessions,
  createRegister,
  deleteRegister,
  ensureDefaultRegister,

  // Sessions
  getSessions,
  openSession,
  closeSession,
  getSessionSummary,
  getSessionHistory,

  // Movements
  getMovements,
  addMovement,

  // Payment integration helpers
  createSaleMovement,
  createTipMovement,
}

export default cashApi
