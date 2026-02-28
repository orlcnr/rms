'use client'

import React, { useMemo } from 'react'
import { Controller } from 'react-hook-form'
import { Modal } from '@/modules/shared/components/Modal'
import { Button } from '@/modules/shared/components/Button'
import { FormInput } from '@/modules/shared/components/FormInput'
import { DateTimePicker } from '@/modules/shared/components/DateTimePicker'
import { CustomerSelector } from '@/modules/orders/components/CustomerSelector'
import { NewCustomerModal } from '@/modules/orders/components/NewCustomerModal'
import { useReservationsStore } from '../store/reservations.store'
import { formatReservationDateTime } from '../utils/date-utils'
import { TableSelector } from './TableSelector'
import { TableTimeline } from './TableTimeline'
import { useReservationModal } from '../hooks/useReservationModal'
import { Reservation, CreateReservationDto } from '../types'

interface ReservationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (reservation?: Reservation) => void
  reservationToEdit?: Reservation
  restaurantId: string
  createReservation?: (data: CreateReservationDto) => Promise<Reservation>
}

export function ReservationModal(props: ReservationModalProps) {
  const {
    form, tables, isLoadingTables, isSubmitting, selectedCustomer, setSelectedCustomer,
    showNewCustomerModal, setShowNewCustomerModal, newCustomerInitialName,
    setNewCustomerInitialName, busyTableIds, onSubmit, selectedTime, selectedTableId
  } = useReservationModal(props)

  const reservations = useReservationsStore(state => state.reservations)

  const lastRes = React.useMemo(() => {
    if (!selectedCustomer?.id) return null
    return reservations
      .filter(r => r.customer_id === selectedCustomer.id)
      .sort((a, b) => new Date(b.reservation_time).getTime() - new Date(a.reservation_time).getTime())[0]
  }, [selectedCustomer, reservations])

  const selectedTableName = React.useMemo(() =>
    tables.find(t => t.id === selectedTableId)?.name || '',
    [tables, selectedTableId])

  return (
    <>
      <Modal
        isOpen={props.isOpen}
        onClose={props.onClose}
        title={props.reservationToEdit?.id ? 'Rezervasyonu Düzenle' : 'Yeni Rezervasyon'}
        className="max-w-6xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 -m-6 h-[calc(90vh-100px)]">
          {/* LEFT PANEL: FORM */}
          <div className="lg:col-span-9 p-8 overflow-y-auto scrollbar-style border-r border-border-light">
            <form onSubmit={onSubmit} className="space-y-8">
              {/* Customer */}
              <div className="space-y-2">
                <CustomerSelector
                  restaurantId={props.restaurantId}
                  value={selectedCustomer?.id}
                  onChange={setSelectedCustomer}
                  onOpenNewCustomerModal={(name) => {
                    setNewCustomerInitialName(name || '')
                    setShowNewCustomerModal(true)
                  }}
                  error={form.formState.errors.customer_id?.message}
                />
                {lastRes && (
                  <p className="text-[10px] font-bold text-primary-main uppercase tracking-tight ml-1">
                    Son Rezervasyon: {formatReservationDateTime(lastRes.reservation_time)} / {lastRes.table?.name}
                  </p>
                )}
              </div>

              {/* Date & Time & Guests */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <Controller
                    name="reservation_time"
                    control={form.control}
                    render={({ field }) => (
                      <DateTimePicker
                        id="reservation_time"
                        label="Rezervasyon Tarihi ve Saati"
                        value={field.value}
                        onChange={field.onChange}
                        error={form.formState.errors.reservation_time?.message}
                        required
                      />
                    )}
                  />
                </div>
                <div className="md:col-span-4">
                  <Controller
                    name="guest_count"
                    control={form.control}
                    render={({ field }) => (
                      <FormInput
                        id="guest_count"
                        name="guest_count"
                        label="Kişi Sayısı"
                        type="number"
                        value={field.value === undefined || field.value === null ? '' : field.value}
                        onChange={(val) => {
                          const parsed = parseInt(val)
                          field.onChange(isNaN(parsed) ? undefined : parsed)
                        }}
                        error={form.formState.errors.guest_count?.message}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Table Selection */}
              <Controller
                name="table_id"
                control={form.control}
                render={({ field }) => (
                  <TableSelector
                    tables={tables}
                    selectedTableId={field.value}
                    onSelect={field.onChange}
                    busyTableIds={busyTableIds}
                    error={form.formState.errors.table_id?.message}
                    disabled={isLoadingTables}
                  />
                )}
              />

              {/* Notes & Prepayment */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <Controller
                    name="notes"
                    control={form.control}
                    render={({ field }) => (
                      <FormInput
                        id="notes"
                        name="notes"
                        label="Özel Notlar"
                        placeholder="Alerjiler, özel istekler vb."
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <div className="md:col-span-4">
                  <Controller
                    name="prepayment_amount"
                    control={form.control}
                    render={({ field }) => (
                      <FormInput
                        id="prepayment_amount"
                        name="prepayment_amount"
                        label="Ön Ödeme (TL)"
                        type="number"
                        value={String(field.value || 0)}
                        onChange={(val) => field.onChange(parseInt(val) || 0)}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-border-light">
                <Button type="button" variant="ghost" onClick={props.onClose} className="uppercase text-[10px] font-black tracking-widest">
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || (!!selectedTableId && busyTableIds.includes(selectedTableId))}
                  className="px-8 uppercase text-[10px] font-black tracking-widest"
                >
                  {isSubmitting ? 'İşleniyor...' : props.reservationToEdit?.id ? 'Güncelle' : 'Rezervasyonu Tamamla'}
                </Button>
              </div>
            </form>
          </div>

          {/* RIGHT PANEL: TIMELINE */}
          <div className="lg:col-span-3 bg-bg-muted/5 max-h-full overflow-hidden">
            <TableTimeline
              tableId={selectedTableId}
              tableName={selectedTableName}
              date={selectedTime ? selectedTime.split('T')[0] : new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date())}
              selectedTime={selectedTime}
              reservations={reservations}
            />
          </div>
        </div>
      </Modal>

      <NewCustomerModal
        isOpen={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        onSuccess={(customer) => {
          setSelectedCustomer(customer)
          form.setValue('customer_id', customer.id)
          setShowNewCustomerModal(false)
        }}
        restaurantId={props.restaurantId}
        initialName={newCustomerInitialName}
      />
    </>
  )
}
