'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { tablesApi } from '@/modules/tables/services/tables.service'
import { Table } from '@/modules/tables/types'
import { Customer } from '@/modules/customers/services/customers.service'
import {
  Reservation,
  CreateReservationDto,
} from '../types'
import {
  createReservationSchema,
  CreateReservationFormData,
} from '../validations/reservation.schema'
import { useReservationConflicts } from '../hooks/useReservationConflicts'
import { useReservationsStore } from '../store/reservations.store'
import { reservationsApi } from '../services/reservations.service'

interface UseReservationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (reservation?: Reservation) => void
  reservationToEdit?: Reservation
  restaurantId: string
  createReservation?: (data: CreateReservationDto) => Promise<Reservation>
}

export function useReservationModal({
  isOpen,
  onClose,
  onSuccess,
  reservationToEdit,
  restaurantId,
  createReservation,
}: UseReservationModalProps) {
  const [tables, setTables] = useState<Table[]>([])
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustomerInitialName, setNewCustomerInitialName] = useState<string>('')
  const [busyTableIds, setBusyTableIds] = useState<string[]>([])
  const [modalReservations, setModalReservations] = useState<Reservation[]>([])

  const { checkConflict } = useReservationConflicts(modalReservations)

  const form = useForm<CreateReservationFormData>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      customer_id: '',
      table_id: '',
      reservation_time: '',
      guest_count: 2,
      prepayment_amount: 0,
      notes: '',
    },
  })

  const { watch, setValue, setError, clearErrors, reset, handleSubmit } = form
  const selectedTableId = watch('table_id')
  const selectedTime = watch('reservation_time')

  // Load Reservations for selected date to check conflicts
  useEffect(() => {
    if (isOpen && selectedTime) {
      // Use local date string instead of splitting UTC ISO string
      const date = new Date(selectedTime).toLocaleDateString('sv-SE')
      reservationsApi.getAll({ date })
        .then(res => {
          // Geliştirme: Ana ekranın bozulmaması için store yerine local state kullanıyoruz.
          setModalReservations(res)
        })
        .catch(console.error)
    }
  }, [isOpen, selectedTime])

  // Load Tables
  useEffect(() => {
    if (isOpen && restaurantId) {
      setIsLoadingTables(true)
      tablesApi
        .getTables(restaurantId)
        .then(setTables)
        .catch(console.error)
        .finally(() => setIsLoadingTables(false))
    }
  }, [isOpen, restaurantId])

  // Reset/Set Form
  useEffect(() => {
    if (isOpen) {
      if (reservationToEdit?.id) {
        setValue('customer_id', reservationToEdit.customer_id)
        setValue('table_id', reservationToEdit.table_id)
        setValue('guest_count', reservationToEdit.guest_count)
        setValue('notes', reservationToEdit.notes || '')
        setValue('prepayment_amount', reservationToEdit.prepayment_amount)

        const date = new Date(reservationToEdit.reservation_time)
        setValue('reservation_time', date.toISOString())

        // Ensure customer is selected in the UI if data is available
        if (reservationToEdit.customer) {
          setSelectedCustomer(reservationToEdit.customer as any)
        }
      } else {
        reset()
        setSelectedCustomer(null)
      }
      setBusyTableIds([])
    }
  }, [isOpen, reservationToEdit, reset, setValue])

  // Conflict Detection
  useEffect(() => {
    if (selectedTime && restaurantId) {
      const busyIds: string[] = []
      tables.forEach((table) => {
        if (table.id !== reservationToEdit?.id) {
          const conflict = checkConflict(table.id, selectedTime, reservationToEdit?.id)
          if (conflict.hasConflict) busyIds.push(table.id)
        }
      })
      setBusyTableIds(busyIds)

      if (selectedTableId) {
        const conflict = checkConflict(selectedTableId, selectedTime, reservationToEdit?.id)
        if (conflict.hasConflict) {
          setError('table_id', { message: 'Bu saatte masa dolu' })
        } else {
          clearErrors('table_id')
        }
      }
    } else {
      setBusyTableIds([])
    }
  }, [selectedTime, selectedTableId, tables, checkConflict, reservationToEdit, setError, clearErrors, restaurantId])

  const onSubmit = async (data: CreateReservationFormData) => {
    if (selectedTableId && busyTableIds.includes(selectedTableId)) {
      toast.error('Seçtiğiniz masa bu saatte dolu')
      return
    }

    setIsSubmitting(true)
    try {
      if (reservationToEdit?.id) {
        toast.success('Rezervasyon güncellendi')
      } else if (createReservation) {
        await createReservation(data)
        toast.success('Rezervasyon oluşturuldu')
      }
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error('İşlem başarısız')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCustomerChange = useCallback((customer: Customer | null) => {
    setSelectedCustomer(customer)
    setValue('customer_id', customer?.id || '', { shouldValidate: true })
  }, [setValue])

  return {
    form,
    tables,
    isLoadingTables,
    isSubmitting,
    selectedCustomer,
    setSelectedCustomer: handleCustomerChange,
    showNewCustomerModal,
    setShowNewCustomerModal,
    newCustomerInitialName,
    setNewCustomerInitialName,
    busyTableIds,
    onSubmit: handleSubmit(onSubmit),
    selectedTime,
    selectedTableId
  }
}
