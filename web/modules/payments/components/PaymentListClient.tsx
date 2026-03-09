'use client'

import { useMemo, useState } from 'react'
import { SubHeaderSection, FilterSection, BodySection } from '@/modules/shared/components/layout'
import { Pagination } from '@/modules/shared/components/Pagination'
import { useSocketStore } from '@/modules/shared/api/socket'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { toInputDateString } from '@/modules/shared/utils/date'
import { getPaymentMethodLabel, PaymentMethod, PaymentStatus } from '@/modules/orders/types'
import { Button, DateTimePicker, FilterToolbar } from '@/modules/shared/components'
import type { Payment, PaymentsPaginatedResponse } from '../types'
import { usePaymentList } from '../hooks/usePaymentList'
import { RefundConfirmModal } from './RefundConfirmModal'
import { formatPaymentDateTime } from '../utils/format-payment-datetime'
import { getPaymentStatusLabel } from '../utils/get-payment-status-label'

interface PaymentListClientProps {
  initialData: PaymentsPaginatedResponse
}

export function PaymentListClient({ initialData }: PaymentListClientProps) {
  const { isConnected } = useSocketStore()
  const { data, filters, isLoading, fetchPayments, refresh, markRefundedInList } =
    usePaymentList({ initialData })

  const [search, setSearch] = useState(filters.search || '')
  const [method, setMethod] = useState<PaymentMethod | ''>((filters.method as PaymentMethod) || '')
  const [status, setStatus] = useState<PaymentStatus | ''>((filters.status as PaymentStatus) || '')
  const [startDate, setStartDate] = useState(filters.startDate || '')
  const [endDate, setEndDate] = useState(filters.endDate || '')
  const [showFilters, setShowFilters] = useState(false)
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null)

  const toPickerValue = (value?: string): string => {
    if (!value) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00`).toISOString()
    }
    return value
  }

  const fromPickerValue = (value: string): string => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return toInputDateString(parsed)
  }

  const totalAmount = useMemo(
    () => data.items.reduce((sum, payment) => sum + Number(payment.final_amount || 0), 0),
    [data.items],
  )
  const activeFilterCount = useMemo(
    () => [method, status, startDate, endDate].filter(Boolean).length,
    [method, status, startDate, endDate],
  )

  const applyFilters = async (page = 1) => {
    await fetchPayments({
      page,
      limit: data.meta.itemsPerPage || 20,
      search: search || undefined,
      method: method || undefined,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
  }

  const resetFilters = async () => {
    setSearch('')
    setMethod('')
    setStatus('')
    setStartDate('')
    setEndDate('')
    await fetchPayments({
      page: 1,
      limit: data.meta.itemsPerPage || 20,
    })
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <SubHeaderSection
        title="ÖDEMELER"
        description="Ödeme kayıtlarını listeleyin ve iade işlemlerini yönetin"
        moduleColor="bg-warning-main"
        isConnected={isConnected}
        isSyncing={isLoading}
        onRefresh={() => {
          void refresh()
        }}
        actions={
          <Button variant="outline" onClick={() => void applyFilters(filters.page || 1)}>
            YENİLE
          </Button>
        }
      />

      <main className="flex flex-col flex-1 pb-6 min-h-0">
        <FilterSection className="flex flex-col gap-4">
          <FilterToolbar
            searchValue={search}
            onSearchChange={setSearch}
            onSearchSubmit={() => {
              void applyFilters(1)
            }}
            searchPlaceholder="SİPARİŞ NO VEYA AÇIKLAMA ARA..."
            onToggleFilters={() => setShowFilters((current) => !current)}
            isFiltersOpen={showFilters}
            activeFilterCount={activeFilterCount}
            rightContent={(
              <div className="flex items-center justify-end gap-6 border-l border-border-light pl-6 ml-auto">
                <div className="text-right">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">KAYIT</p>
                  <p className="text-lg font-black text-text-primary tabular-nums">{data.meta.totalItems}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">TOPLAM</p>
                  <p className="text-lg font-black text-text-primary tabular-nums">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            )}
            panel={(
              <div className="bg-bg-surface border border-border-light rounded-sm shadow-sm p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                    value={method}
                    onChange={(event) => setMethod(event.target.value as PaymentMethod | '')}
                    className="h-11 border border-border-light rounded-sm bg-bg-surface px-3 text-[11px] font-black uppercase tracking-wider text-text-primary"
                  >
                    <option value="">TÜM YÖNTEMLER</option>
                    {Object.values(PaymentMethod).map((value) => (
                      <option key={value} value={value}>
                        {getPaymentMethodLabel(value)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as PaymentStatus | '')}
                    className="h-11 border border-border-light rounded-sm bg-bg-surface px-3 text-[11px] font-black uppercase tracking-wider text-text-primary"
                  >
                    <option value="">TÜM DURUMLAR</option>
                    {Object.values(PaymentStatus).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <DateTimePicker
                    id="paymentsStartDate"
                    label="BAŞLANGIÇ TARİHİ"
                    showTime={false}
                    value={toPickerValue(startDate)}
                    onChange={(value: string) => setStartDate(fromPickerValue(value))}
                    placeholder="Tarih seçin"
                  />
                  <DateTimePicker
                    id="paymentsEndDate"
                    label="BİTİŞ TARİHİ"
                    showTime={false}
                    value={toPickerValue(endDate)}
                    onChange={(value: string) => setEndDate(fromPickerValue(value))}
                    placeholder="Tarih seçin"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => void resetFilters()}>
                    TEMİZLE
                  </Button>
                  <Button variant="primary" onClick={() => void applyFilters(1)}>
                    UYGULA
                  </Button>
                </div>
              </div>
            )}
          />
        </FilterSection>

        <BodySection noPadding className="overflow-hidden">
          <div className="min-h-0 h-full flex flex-col">
            <div className="grid grid-cols-8 gap-2 px-4 py-3 bg-bg-app border-b border-border-light text-[10px] font-black uppercase tracking-wider text-text-muted">
              <span>Tarih</span>
              <span>Sipariş</span>
              <span>Masa</span>
              <span>Yöntem</span>
              <span>Tutar</span>
              <span>Durum</span>
              <span>Açıklama</span>
              <span className="text-right">İşlemler</span>
            </div>
            <div className="flex-1 overflow-auto">
              {data.items.map((payment) => {
                const isRefunded = payment.status === PaymentStatus.REFUNDED
                const isOpenAccount = payment.payment_method === PaymentMethod.OPEN_ACCOUNT
                const disableRefundAction = isRefunded || isOpenAccount
                return (
                  <div
                    key={payment.id}
                    className="grid grid-cols-8 gap-2 px-4 py-3 border-b border-border-light hover:bg-bg-app/50 transition-colors items-center"
                  >
                    <span className="text-xs font-bold text-text-secondary">
                      {formatPaymentDateTime(payment.created_at)}
                    </span>
                    <span className="text-xs font-black text-text-primary">
                      {payment.order_number || `#${payment.order_id.slice(0, 8)}`}
                    </span>
                    <span className="text-xs font-bold text-text-primary">
                      {payment.table_name || '-'}
                    </span>
                    <span className="text-xs font-bold text-text-primary">{getPaymentMethodLabel(payment.payment_method)}</span>
                    <span className="text-xs font-mono font-black text-text-primary">{formatCurrency(payment.final_amount)}</span>
                    <span className="text-[10px] font-black uppercase text-text-secondary">
                      {getPaymentStatusLabel(payment.status)}
                    </span>
                    <span className="text-xs text-text-muted truncate">{payment.description || '-'}</span>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant={disableRefundAction ? 'outline' : 'danger'}
                        disabled={disableRefundAction}
                        onClick={() => setRefundTarget(payment)}
                      >
                        {isRefunded ? 'İADE EDİLDİ' : isOpenAccount ? 'İADE YOK' : 'İADE ET'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            <Pagination
              totalItems={data.meta.totalItems}
              itemsPerPage={data.meta.itemsPerPage}
              currentPage={data.meta.currentPage}
              onPageChange={(page) => {
                void applyFilters(page)
              }}
            />
          </div>
        </BodySection>
      </main>

      <RefundConfirmModal
        isOpen={Boolean(refundTarget)}
        payment={refundTarget}
        onClose={() => setRefundTarget(null)}
        onSuccess={async (paymentId) => {
          markRefundedInList(paymentId)
          await refresh()
        }}
      />
    </div>
  )
}
