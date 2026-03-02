'use client'

import React, { useMemo } from 'react'
import { toast } from 'sonner'
import { BodySection, FilterSection, SubHeaderSection } from '@/modules/shared/components/layout'
import { Button } from '@/modules/shared/components/Button'
import { Pagination } from '@/modules/shared/components/Pagination'
import { NotificationType } from '../types'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationList } from './NotificationList'

const TYPE_OPTIONS: Array<{ label: string; value: NotificationType | 'all' }> = [
  { label: 'Tüm Tipler', value: 'all' },
  { label: 'Yeni Sipariş', value: 'new_order' },
  { label: 'Sipariş Durumu', value: 'order_status' },
  { label: 'Misafir Siparişi', value: 'guest_order' },
  { label: 'Garson Çağrısı', value: 'waiter_call' },
  { label: 'Hesap Talebi', value: 'bill_request' },
  { label: 'Sistem', value: 'system' },
]

export function NotificationsClient() {
  const {
    notifications,
    meta,
    page,
    isReadFilter,
    typeFilter,
    isLoading,
    isMutating,
    setPage,
    setIsReadFilter,
    setTypeFilter,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications({ initialLimit: 20, realtime: true })

  const statusLabel = useMemo(() => {
    if (isReadFilter === true) return 'Okunmuş'
    if (isReadFilter === false) return 'Okunmamış'
    return 'Tümü'
  }, [isReadFilter])

  const typeLabel = useMemo(() => {
    return TYPE_OPTIONS.find((option) => option.value === (typeFilter || 'all'))?.label || 'Tüm Tipler'
  }, [typeFilter])

  async function handleRefresh() {
    try {
      await refresh()
      toast.success('Bildirimler yenilendi')
    } catch {
      toast.error('Bildirimler yenilenemedi')
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead()
      toast.success('Tüm bildirimler okundu olarak işaretlendi')
    } catch {
      toast.error('İşlem başarısız')
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden px-Layout">
      <SubHeaderSection
        title="BİLDİRİMLER"
        description="Sistem ve operasyon bildirim akışı"
        moduleColor="bg-info-main"
        isSyncing={isLoading || isMutating}
        onRefresh={handleRefresh}
        actions={
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            isLoading={isMutating}
          >
            TÜMÜNÜ OKUNDU YAP
          </Button>
        }
      />

      <main className="flex flex-col flex-1 pb-6 min-h-0">
        <FilterSection className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPage(1)
                setIsReadFilter(undefined)
              }}
              className={`px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-sm border ${
                isReadFilter === undefined
                  ? 'bg-primary-main text-white border-primary-main'
                  : 'bg-bg-surface border-border-light text-text-secondary'
              }`}
            >
              TÜMÜ
            </button>
            <button
              onClick={() => {
                setPage(1)
                setIsReadFilter(false)
              }}
              className={`px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-sm border ${
                isReadFilter === false
                  ? 'bg-primary-main text-white border-primary-main'
                  : 'bg-bg-surface border-border-light text-text-secondary'
              }`}
            >
              OKUNMAMIŞ
            </button>
            <button
              onClick={() => {
                setPage(1)
                setIsReadFilter(true)
              }}
              className={`px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-sm border ${
                isReadFilter === true
                  ? 'bg-primary-main text-white border-primary-main'
                  : 'bg-bg-surface border-border-light text-text-secondary'
              }`}
            >
              OKUNMUŞ
            </button>
          </div>

          <select
            className="h-10 min-w-[220px] rounded-sm border border-border-light bg-bg-surface px-3 text-sm"
            value={typeFilter || 'all'}
            onChange={(event) => {
              setPage(1)
              const nextType = event.target.value
              setTypeFilter(nextType === 'all' ? undefined : (nextType as NotificationType))
            }}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterSection>

        <BodySection noPadding className="overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border-light bg-bg-app/30 text-[11px] font-black uppercase tracking-wider text-text-muted">
            Durum: {statusLabel} • Tip: {typeLabel}
          </div>

          <div className="flex-1 overflow-y-auto">
            <NotificationList
              notifications={notifications}
              isLoading={isLoading}
              onMarkAsRead={(id) => {
                void markAsRead(id)
              }}
            />
          </div>

          <Pagination
            totalItems={meta.totalItems}
            itemsPerPage={meta.itemsPerPage || 20}
            onPageChange={setPage}
            currentPage={page}
          />
        </BodySection>
      </main>
    </div>
  )
}

