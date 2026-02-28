import { useState, useCallback, useEffect, useRef } from 'react'
import { useCashSocket } from '@/modules/shared/api/socket'
import { cashApi } from '../services'
import { usePendingQueue } from '@/modules/shared/hooks/usePendingQueue'
import type {
  CashRegister,
  CashSession,
  CashMovement,
  CashPaymentMethod,
  CashSummaryData,
  CashCloseData,
  CashOpenData,
  CashRegisterWithStatus,
  ActiveSessionWrapper,
  CreateMovementData,
} from '../types'
import { CashMovementType, CashMovementSubtype } from '../types'

interface UseCashOptions {
  restaurantId?: string
  initialRegisters?: CashRegisterWithStatus[]
  initialSessions?: ActiveSessionWrapper[]
  initialSummary?: CashSummaryData | null
}

export function useCash(options?: UseCashOptions) {
  const initialRegisters = options?.initialRegisters
  const initialSessions = options?.initialSessions
  const initialSummary = options?.initialSummary

  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [registersWithStatus, setRegistersWithStatus] = useState<CashRegisterWithStatus[]>(
    initialRegisters || []
  )
  const [activeSessions, setActiveSessions] = useState<ActiveSessionWrapper[]>(initialSessions || [])
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [summary, setSummary] = useState<CashSummaryData | null>(initialSummary || null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const pendingQueue = usePendingQueue()
  const suppressedTransactionIds = useRef<Set<string>>(new Set())

  const { on, off, isConnected, connect } = useCashSocket(options?.restaurantId || '')

  useEffect(() => {
    if (options?.restaurantId) {
      connect(options.restaurantId)
    }
  }, [options?.restaurantId, connect])

  // --------------------------------------------
  // Mount: Client-side fresh summary fetch
  // --------------------------------------------
  useEffect(() => {
    const sessionId = initialSessions?.[0]?.session?.id
    if (sessionId) {
      fetchSessionSummary(sessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --------------------------------------------
  // Register Operations
  // --------------------------------------------

  const fetchRegisters = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await cashApi.getRegisters()
      setRegisters(data)
      return data
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchRegistersWithStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await cashApi.getRegistersWithStatus()
      setRegistersWithStatus(data)
      return data
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createRegister = useCallback(async (name: string) => {
    setIsLoading(true)
    setIsSyncing(true)
    setError(null)
    const txId = crypto.randomUUID()
    try {
      suppressedTransactionIds.current.add(txId)
      await cashApi.createRegister(name)
      await fetchRegistersWithStatus()
      await fetchRegisters()
    } catch (err: any) {
      suppressedTransactionIds.current.delete(txId)
      setError(err as Error)
      if (err.code === 'ERR_NETWORK' || !err.response) {
        pendingQueue.add({
          id: txId,
          module: 'cash',
          endpoint: '/cash/registers',
          method: 'POST',
          payload: { name }
        })
      }
      throw err
    } finally {
      setIsLoading(false)
      setIsSyncing(false)
    }
  }, [fetchRegistersWithStatus, fetchRegisters, pendingQueue])

  const deleteRegister = useCallback(async (registerId: string) => {
    setIsLoading(true)
    setIsSyncing(true)
    setError(null)
    const txId = crypto.randomUUID()
    try {
      suppressedTransactionIds.current.add(txId)
      await cashApi.deleteRegister(registerId)
      await fetchRegistersWithStatus()
      await fetchRegisters()
    } catch (err: any) {
      suppressedTransactionIds.current.delete(txId)
      setError(err as Error)
      if (err.code === 'ERR_NETWORK' || !err.response) {
        pendingQueue.add({
          id: txId,
          module: 'cash',
          endpoint: `/cash/registers/${registerId}`,
          method: 'DELETE',
          payload: {}
        })
      }
      throw err
    } finally {
      setIsLoading(false)
      setIsSyncing(false)
    }
  }, [fetchRegistersWithStatus, fetchRegisters, pendingQueue])

  const fetchActiveSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await cashApi.getActiveSessions()
      setActiveSessions(data)
      return data
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // --------------------------------------------
  // Session Operations
  // --------------------------------------------

  const openSession = useCallback(async (data: CashOpenData) => {
    setIsLoading(true)
    setIsSyncing(true)
    setError(null)
    const txId = crypto.randomUUID()
    const requestData = { ...data, transaction_id: txId }

    try {
      suppressedTransactionIds.current.add(txId)
      const session = await cashApi.openSession(requestData)
      await fetchActiveSessions()
      return session
    } catch (err: any) {
      suppressedTransactionIds.current.delete(txId)
      setError(err as Error)
      if (err.code === 'ERR_NETWORK' || !err.response) {
        pendingQueue.add({
          id: txId,
          module: 'cash',
          endpoint: '/cash/sessions',
          method: 'POST',
          payload: requestData
        })
      }
      throw err
    } finally {
      setIsLoading(false)
      setIsSyncing(false)
    }
  }, [fetchActiveSessions, pendingQueue])

  const closeSession = useCallback(async (sessionId: string, data: CashCloseData) => {
    setIsLoading(true)
    setIsSyncing(true)
    setError(null)
    const txId = crypto.randomUUID()
    const requestData = { ...data, transaction_id: txId }

    try {
      suppressedTransactionIds.current.add(txId)
      const session = await cashApi.closeSession(sessionId, requestData)
      await fetchActiveSessions()
      return session
    } catch (err: any) {
      suppressedTransactionIds.current.delete(txId)
      setError(err as Error)
      if (err.code === 'ERR_NETWORK' || !err.response) {
        pendingQueue.add({
          id: txId,
          module: 'cash',
          endpoint: `/cash/sessions/${sessionId}/close`,
          method: 'POST',
          payload: requestData
        })
      }
      throw err
    } finally {
      setIsLoading(false)
      setIsSyncing(false)
    }
  }, [fetchActiveSessions, pendingQueue])

  const fetchSessionSummary = useCallback(async (sessionId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await cashApi.getSessionSummary(sessionId)
      setSummary(data)
      return data
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // --------------------------------------------
  // Movement Operations
  // --------------------------------------------

  const fetchMovements = useCallback(async (sessionId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await cashApi.getMovements(sessionId)
      setMovements(data)
      return data
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addMovement = useCallback(
    async (sessionId: string, data: CreateMovementData) => {
      setIsLoading(true)
      setIsSyncing(true)
      setError(null)
      const txId = crypto.randomUUID()
      const requestData = { ...data, transaction_id: txId }

      try {
        suppressedTransactionIds.current.add(txId)
        const movement = await cashApi.addMovement(sessionId, requestData)
        setMovements((prev) => [...prev, movement])
        return movement
      } catch (err: any) {
        suppressedTransactionIds.current.delete(txId)
        setError(err as Error)
        if (err.code === 'ERR_NETWORK' || !err.response) {
          pendingQueue.add({
            id: txId,
            module: 'cash',
            endpoint: `/cash/sessions/${sessionId}/movements`,
            method: 'POST',
            payload: requestData
          })
        }
        throw err
      } finally {
        setIsLoading(false)
        setIsSyncing(false)
      }
    },
    [pendingQueue]
  )

  // --------------------------------------------
  // Sale Movement (for payment integration)
  // --------------------------------------------

  const createSaleMovement = useCallback(
    async (
      sessionId: string,
      orderId: string,
      amount: number,
      paymentMethod: CashPaymentMethod,
      isLiquid: boolean
    ) => {
      return addMovement(sessionId, {
        type: CashMovementType.SALE,
        subtype: CashMovementSubtype.REGULAR,
        paymentMethod,
        amount,
        description: `Sipariş #${orderId} Satış`,
        orderId,
        isLiquid,
        isRevenue: true,
      })
    },
    [addMovement]
  )

  // --------------------------------------------
  // Tip Movement (for payment integration)
  // --------------------------------------------

  const createTipMovement = useCallback(
    async (
      sessionId: string,
      orderId: string,
      tipAmount: number,
      paymentMethod: CashPaymentMethod,
      isLiquid: boolean
    ) => {
      return addMovement(sessionId, {
        type: CashMovementType.IN,
        subtype: CashMovementSubtype.TIP,
        paymentMethod,
        amount: tipAmount,
        description: `Sipariş #${orderId} Bahşiş`,
        orderId,
        isLiquid,
        isRevenue: false,
      })
    },
    [addMovement]
  )

  // --------------------------------------------
  // Socket listeners
  // --------------------------------------------
  useEffect(() => {
    if (!isConnected) return

    const handleSessionUpdate = (data: any) => {
      if (data.transaction_id && suppressedTransactionIds.current.has(data.transaction_id)) {
        suppressedTransactionIds.current.delete(data.transaction_id)
        return
      }
      console.log('[useCash] Socket: cash:session_updated', data)
      fetchRegistersWithStatus()
      fetchActiveSessions()
    }

    const handleMovementUpdate = (data: any) => {
      if (data.transaction_id && suppressedTransactionIds.current.has(data.transaction_id)) {
        suppressedTransactionIds.current.delete(data.transaction_id)
        return
      }
      const payload = data as { sessionId?: string }
      console.log('[useCash] Socket: cash:movement_added', payload)
      fetchRegistersWithStatus()
      fetchActiveSessions()

      const currentSessionId = payload?.sessionId
      if (currentSessionId) {
        fetchSessionSummary(currentSessionId)
        fetchMovements(currentSessionId)
      }
    }

    on('cash:session_updated', handleSessionUpdate)
    on('cash:movement_added', handleMovementUpdate)

    return () => {
      off('cash:session_updated')
      off('cash:movement_added')
    }
  }, [
    isConnected,
    fetchRegistersWithStatus,
    fetchActiveSessions,
    fetchSessionSummary,
    fetchMovements,
    on,
    off,
  ])

  // --------------------------------------------
  // Return
  // --------------------------------------------

  return {
    // State
    registers,
    registersWithStatus,
    activeSessions,
    movements,
    summary,
    isLoading,
    isSyncing,
    error,

    // Register operations
    fetchRegisters,
    fetchRegistersWithStatus,
    createRegister,
    deleteRegister,
    fetchActiveSessions,

    // Session operations
    openSession,
    closeSession,
    fetchSessionSummary,

    // Movement operations
    fetchMovements,
    addMovement,

    // Payment integration helpers
    createSaleMovement,
    createTipMovement,
  }
}

export default useCash
