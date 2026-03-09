// ============================================
// CASH MODULE API SERVICES
// Backend: backend/src/modules/cash/cash.controller.ts
// ============================================

import { http } from '@/modules/shared/api/http'
import { PaginatedResponse } from '@/modules/shared/types'
import {
  CashRegister,
  CashSession,
  CashMovement,
  CashRegisterWithStatus,
  CashSummaryData,
  CreateMovementData,
  CashCloseData,
  CashOpenData,
  ActiveSessionWrapper,
  CashSessionHistoryFilters,
  CashMovementType,
  CashMovementSubtype,
  ReconciliationReport,
} from './types'

const DEFAULT_HISTORY_META = {
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: 10,
  totalPages: 0,
  currentPage: 1,
}

const parseSessionHistory = (
  raw: Partial<PaginatedResponse<CashSession>> | null | undefined
): PaginatedResponse<CashSession> => {
  const items = Array.isArray(raw?.items) ? raw.items : []
  const meta = raw?.meta

  return {
    items,
    meta: {
      totalItems: Number(meta?.totalItems ?? items.length),
      itemCount: Number(meta?.itemCount ?? items.length),
      itemsPerPage: Number(meta?.itemsPerPage ?? DEFAULT_HISTORY_META.itemsPerPage),
      totalPages: Number(meta?.totalPages ?? 1),
      currentPage: Number(meta?.currentPage ?? DEFAULT_HISTORY_META.currentPage),
    },
  }
}

const parseReconciliation = (
  raw: ReconciliationReport
): ReconciliationReport => ({
  ...raw,
  is_live: Boolean(raw?.is_live),
})

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all cash registers for a restaurant
 */
export const getRegisters = async (): Promise<CashRegister[]> => {
  return await http.get<CashRegister[]>('/cash/registers')
}

/**
 * Get cash registers with their current status
 */
export const getRegistersWithStatus = async (): Promise<CashRegisterWithStatus[]> => {
  return await http.get<CashRegisterWithStatus[]>('/cash/registers')
}

/**
 * Get all active sessions across all registers
 */
export const getActiveSessions = async (): Promise<ActiveSessionWrapper[]> => {
  return await http.get<ActiveSessionWrapper[]>('/cash/registers/active-sessions')
}

/**
 * Create a new cash register
 */
export const createRegister = async (name: string): Promise<CashRegister> => {
  return await http.post<CashRegister>('/cash/registers', { name })
}

/**
 * Delete a cash register (soft delete)
 */
export const deleteRegister = async (registerId: string): Promise<void> => {
  return await http.delete<void>(`/cash/registers/${registerId}`)
}

/**
 * Ensure a default register exists
 */
export const ensureDefaultRegister = async (): Promise<CashRegister> => {
  return await http.post<CashRegister>('/cash/registers/ensure-default', {})
}

/**
 * Get sessions for a specific register
 */
export const getSessions = async (registerId: string): Promise<CashSession[]> => {
  return await http.get<CashSession[]>(`/cash/registers/${registerId}/sessions`)
}

/**
 * Open a new cash session
 */
export const openSession = async (data: CashOpenData): Promise<CashSession> => {
  return await http.post<CashSession>('/cash/sessions/open', data)
}

/**
 * Close a cash session
 */
export const closeSession = async (
  sessionId: string,
  data: CashCloseData
): Promise<CashSession> => {
  return await http.post<CashSession>(`/cash/sessions/${sessionId}/close`, data)
}

/**
 * Get movements for a session
 */
export const getMovements = async (sessionId: string): Promise<CashMovement[]> => {
  return await http.get<CashMovement[]>(`/cash/sessions/${sessionId}/movements`)
}

/**
 * Add a new movement to a session
 */
export const addMovement = async (
  sessionId: string,
  data: CreateMovementData
): Promise<CashMovement> => {
  const { isLiquid, isRevenue, ...payload } = data
  void isLiquid
  void isRevenue

  return await http.post<CashMovement>(`/cash/sessions/${sessionId}/movements`, payload)
}

/**
 * Get session summary (sales, tips, etc.)
 */
export const getSessionSummary = async (sessionId: string): Promise<CashSummaryData> => {
  return await http.get<CashSummaryData>(`/cash/sessions/${sessionId}/summary`)
}

/**
 * Get session history with filters and pagination
 */
export const getSessionHistory = async (
  filters?: CashSessionHistoryFilters
): Promise<PaginatedResponse<CashSession>> => {
  const response = await http.get<PaginatedResponse<CashSession>>('/cash/sessions/history', {
    params: filters,
  })
  return parseSessionHistory(response)
}

/**
 * Get full reconciliation report for a session
 */
export const getReconciliationReport = async (sessionId: string): Promise<ReconciliationReport> => {
  const response = await http.get<ReconciliationReport>(`/cash/sessions/${sessionId}/reconciliation`)
  return parseReconciliation(response)
}

/**
 * Get a single session by ID with movements
 */
export const getSessionById = async (sessionId: string): Promise<CashSession> => {
  return await http.get<CashSession>(`/cash/sessions/${sessionId}`)
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
  getSessionById,

  // Movements
  getMovements,
  addMovement,

  // Reports
  getReconciliationReport,
}

export default cashApi
