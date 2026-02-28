import { useEffect, useCallback, useState, useRef } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { useReservationsStore } from '../store/reservations.store'
import { useSocketStore } from '@/modules/shared/api/socket'
import { reservationsApi } from '../services/reservations.service'
import { usePendingQueue } from '@/modules/shared/hooks/usePendingQueue'
import {
  Reservation,
  ReservationStatus,
  GetReservationsParams,
  CreateReservationDto,
  UpdateReservationDto,
} from '../types'
import { getNow } from '@/modules/shared/utils/date'
import { withOptimisticUpdate } from '../utils/reservation.utils'

export function useReservations(
  restaurantId: string,
  params?: GetReservationsParams,
  initialReservations: Reservation[] = [],
  view: 'agenda' | 'weekly' | 'monthly' = 'agenda'
) {
  const {
    reservations: storeReservations,
    isLoading,
    error,
    setReservations,
    addReservation,
    updateReservation,
    removeReservation,
    setLoading,
    setError,
    getUpcomingReservations,
    optimisticUpdate,
    commitUpdate,
    rollbackUpdate,
    selectedDate,
    setSelectedDate,
  } = useReservationsStore()

  // Socket store
  const { connect: connectSocket, disconnect: disconnectSocket, on, off, isConnected } =
    useSocketStore()

  // Hybrid Communication states
  const [isSyncing, setIsSyncing] = useState(false)
  const pendingQueue = usePendingQueue()
  const suppressedTransactionIds = useRef<Set<string>>(new Set())

  // Mounted state for hydration safety
  const [mounted, setMounted] = useState(false)

  // Loop prevention - initialized ref
  const initialized = useRef(false)
  const restaurantIdRef = useRef<string | null>(null)

  const reservations = storeReservations

  // ============================================
  // FETCH RESERVATIONS
  // ============================================

  const paramsRef = useRef(params)
  useEffect(() => {
    paramsRef.current = params
  }, [params])

  const fetchReservations = useCallback(async () => {
    if (!restaurantId) return

    setLoading(true)
    try {
      let data;
      const baseDate = selectedDate ? new Date(selectedDate) : getNow();

      if (view === 'agenda') {
        data = await reservationsApi.getAll({
          date: selectedDate,
          ...paramsRef.current,
        });
      } else if (view === 'weekly') {
        const start = format(startOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const end = format(endOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        data = await reservationsApi.getAll({
          startDate: start,
          endDate: end,
          ...paramsRef.current,
        });
      } else {
        const start = format(startOfMonth(baseDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(baseDate), 'yyyy-MM-dd');
        data = await reservationsApi.getAll({
          startDate: start,
          endDate: end,
          ...paramsRef.current,
        });
      }

      setReservations(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch reservations:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, selectedDate, view, setReservations, setLoading, setError])

  const fetchReservationsRef = useRef(fetchReservations)
  useEffect(() => {
    fetchReservationsRef.current = fetchReservations
  }, [fetchReservations])

  // ============================================
  // INITIALIZATION EFFECT
  // ============================================

  useEffect(() => {
    setMounted(true)
    return () => {
      setMounted(false)
    }
  }, [])

  useEffect(() => {
    if (!mounted || !initialized.current) return
    fetchReservations()
  }, [selectedDate, fetchReservations, mounted])

  useEffect(() => {
    if (!mounted || !restaurantId) return

    if (restaurantIdRef.current !== restaurantId) {
      restaurantIdRef.current = restaurantId
      initialized.current = false
    }

    if (initialized.current) {
      return
    }

    initialized.current = true

    if (initialReservations && initialReservations.length > 0) {
      setReservations(initialReservations)
    } else {
      fetchReservationsRef.current()
    }
  }, [mounted, restaurantId, initialReservations, setReservations])

  // ============================================
  // SOCKET CONNECTION
  // ============================================

  useEffect(() => {
    if (!mounted || !restaurantId) return

    connectSocket(restaurantId)

    const handleNewReservation = (data: any) => {
      if (data.transaction_id && suppressedTransactionIds.current.has(data.transaction_id)) {
        suppressedTransactionIds.current.delete(data.transaction_id)
        return
      }
      const reservation = data as Reservation
      addReservation(reservation)
    }

    const handleUpdateReservation = (data: any) => {
      if (data.transaction_id && suppressedTransactionIds.current.has(data.transaction_id)) {
        suppressedTransactionIds.current.delete(data.transaction_id)
        return
      }
      const { id, changes } = data as { id: string; changes: Partial<Reservation> }
      updateReservation(id, changes)
    }

    const handleDeleteReservation = (data: any) => {
      if (data.transaction_id && suppressedTransactionIds.current.has(data.transaction_id)) {
        suppressedTransactionIds.current.delete(data.transaction_id)
        return
      }
      const { id } = data as { id: string }
      removeReservation(id)
    }

    on('reservation:created', handleNewReservation)
    on('reservation:updated', handleUpdateReservation)
    on('reservation:deleted', handleDeleteReservation)

    return () => {
      off('reservation:created')
      off('reservation:updated')
      off('reservation:deleted')
      disconnectSocket()
    }
  }, [
    mounted,
    restaurantId,
    connectSocket,
    disconnectSocket,
    on,
    off,
    addReservation,
    updateReservation,
    removeReservation,
  ])

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  const createReservationFn = useCallback(
    async (data: CreateReservationDto): Promise<Reservation> => {
      setIsSyncing(true)
      const txId = crypto.randomUUID()
      const requestData = { ...data, transaction_id: txId }

      try {
        suppressedTransactionIds.current.add(txId)
        const reservation = await reservationsApi.create(requestData)
        addReservation(reservation)
        return reservation
      } catch (err: any) {
        suppressedTransactionIds.current.delete(txId)
        if (err.code === 'ERR_NETWORK' || !err.response) {
          pendingQueue.add({
            id: txId,
            module: 'reservations',
            endpoint: '/reservations',
            method: 'POST',
            payload: requestData
          })
        }
        throw err
      } finally {
        setIsSyncing(false)
      }
    },
    [addReservation, pendingQueue]
  )

  const updateReservationById = useCallback(
    async (id: string, data: Partial<UpdateReservationDto>): Promise<Reservation> => {
      setIsSyncing(true)
      const txId = crypto.randomUUID()
      const requestData = { ...data, transaction_id: txId }

      try {
        suppressedTransactionIds.current.add(txId)
        const reservation = await reservationsApi.update(id, requestData)
        updateReservation(id, reservation)
        return reservation
      } catch (err: any) {
        suppressedTransactionIds.current.delete(txId)
        if (err.code === 'ERR_NETWORK' || !err.response) {
          pendingQueue.add({
            id: txId,
            module: 'reservations',
            endpoint: `/reservations/${id}`,
            method: 'PATCH',
            payload: requestData
          })
        }
        throw err
      } finally {
        setIsSyncing(false)
      }
    },
    [updateReservation, pendingQueue]
  )

  const deleteReservationFn = useCallback(async (id: string): Promise<void> => {
    setIsSyncing(true)
    const txId = crypto.randomUUID()

    try {
      suppressedTransactionIds.current.add(txId)
      await reservationsApi.delete(id)
      removeReservation(id)
    } catch (err: any) {
      suppressedTransactionIds.current.delete(txId)
      if (err.code === 'ERR_NETWORK' || !err.response) {
        pendingQueue.add({
          id: txId,
          module: 'reservations',
          endpoint: `/reservations/${id}`,
          method: 'DELETE',
          payload: {}
        })
      }
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [removeReservation, pendingQueue])

  // ============================================
  // OPTIMISTIC STATUS UPDATE
  // ============================================

  const updateStatusOptimistic = useCallback(
    async (reservationId: string, newStatus: ReservationStatus): Promise<void> => {
      const txId = crypto.randomUUID()
      const store = {
        optimisticUpdate,
        commitUpdate,
        rollbackUpdate,
      }

      setIsSyncing(true)
      try {
        suppressedTransactionIds.current.add(txId)
        await withOptimisticUpdate(
          reservationId,
          { status: newStatus },
          store,
          () => reservationsApi.updateStatus(reservationId, newStatus)
        )
      } catch (err: any) {
        suppressedTransactionIds.current.delete(txId)
        if (err.code === 'ERR_NETWORK' || !err.response) {
          pendingQueue.add({
            id: txId,
            module: 'reservations',
            endpoint: `/reservations/${reservationId}/status`,
            method: 'PATCH',
            payload: { status: newStatus }
          })
        }
        throw err
      } finally {
        setIsSyncing(false)
      }
    },
    [optimisticUpdate, commitUpdate, rollbackUpdate, pendingQueue]
  )

  const selectDate = useCallback(
    (date: string) => {
      setSelectedDate(date)
    },
    [setSelectedDate]
  )

  // ============================================
  // RETURN
  // ============================================

  return {
    reservations,
    isLoading,
    isSyncing,
    error,
    selectedDate,

    isSocketConnected: isConnected,

    refetch: fetchReservations,
    createReservation: createReservationFn,
    updateReservation: updateReservationById,
    deleteReservation: deleteReservationFn,

    updateStatusOptimistic,

    selectDate,
    setSelectedDate,

    addReservation,
    updateReservationInStore: updateReservation,
    removeReservation,
    getUpcomingReservations,
  }
}
