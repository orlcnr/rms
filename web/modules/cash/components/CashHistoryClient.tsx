'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  SubHeaderSection,
  FilterSection,
  BodySection
} from '@/modules/shared/components/layout'
import { SessionHistoryTable } from './SessionHistoryTable'
import {
  CashSession,
  CashRegister,
  CashSessionHistoryFilters
} from '../types'
import { PaginatedResponse } from '@/modules/shared/types'
import { cashApi } from '../services'
import { Button } from '@/modules/shared/components/Button'
import { History, Search } from 'lucide-react'
import { FormInput } from '@/modules/shared/components/FormInput'
import { DateTimePicker } from '@/modules/shared/components/DateTimePicker'
import { toInputDateString } from '@/modules/shared/utils/date'

interface CashHistoryClientProps {
  initialData: PaginatedResponse<CashSession>
  registers: CashRegister[]
  filters: CashSessionHistoryFilters
}

export function CashHistoryClient({
  initialData,
  registers,
  filters: initialFilters
}: CashHistoryClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [data, setData] = useState<PaginatedResponse<CashSession>>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState(initialFilters)

  const normalizeDateFilter = (value?: string): string | undefined => {
    if (!value) return undefined
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return undefined
    return toInputDateString(parsed)
  }

  const toPickerValue = (value?: string): string => {
    if (!value) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00`).toISOString()
    }
    return value
  }

  const normalizeFilters = (raw: CashSessionHistoryFilters): CashSessionHistoryFilters => ({
    ...raw,
    startDate: normalizeDateFilter(raw.startDate),
    endDate: normalizeDateFilter(raw.endDate),
  })

  const updateQueryParams = (newFilters: Partial<CashSessionHistoryFilters>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value.toString())
      } else {
        params.delete(key)
      }
    })

    router.push(`${pathname}?${params.toString()}`)
  }

  const fetchHistory = useCallback(async (nextFilters: CashSessionHistoryFilters) => {
    setIsLoading(true)
    try {
      const response = await cashApi.getSessionHistory(nextFilters)
      setData(response)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handlePageChange = (page: number) => {
    const nextFilters = normalizeFilters({ ...filters, page })
    setFilters(nextFilters)
    void fetchHistory(nextFilters)
    updateQueryParams(nextFilters)
  }

  const handleFilterChange = (key: keyof CashSessionHistoryFilters, value: any) => {
    const newFilters = { ...filters, [key]: value, page: 1 }
    setFilters(newFilters)
    // We don't call updateQueryParams here to avoid too many refreshes while typing
  }

  const applyFilters = () => {
    const normalized = normalizeFilters(filters)
    setFilters(normalized)
    void fetchHistory(normalized)
    updateQueryParams(normalized)
  }

  useEffect(() => {
    setData(initialData)
    setFilters(initialFilters)
  }, [initialData, initialFilters])

  useEffect(() => {
    const normalized = normalizeFilters(initialFilters)
    setFilters(normalized)
    void fetchHistory(normalized)
  }, [fetchHistory, initialFilters])

  return (
    <div className="flex flex-col min-h-screen bg-bg-app">
      <SubHeaderSection
        title="KASA GEÇMİŞİ"
        description="Geçmiş kasa oturumları ve mutabakat raporları"
        actions={
          <Button variant="outline" onClick={() => router.push('/cash')}>
            <History size={16} className="mr-2" />
            AKTİF KASALAR
          </Button>
        }
      />

      <main className="flex flex-col flex-1 pb-6 min-h-0">
        <FilterSection>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-[300px]">
              <FormInput
                id="registerId"
                name="registerId"
                label="KASA SEÇİMİ"
                value={filters.registerId || ''}
                onChange={(val) => handleFilterChange('registerId', val)}
                isSelect
                options={[
                  { value: '', label: 'TÜM KASALAR' },
                  ...registers.map(r => ({ value: r.id, label: r.name.toUpperCase() }))
                ]}
              />
            </div>
            <div className="w-[200px]">
              <DateTimePicker
                id="startDatePicker"
                label="BAŞLANGIÇ TARİHİ"
                showTime={false}
                value={toPickerValue(filters.startDate)}
                onChange={(val) => handleFilterChange('startDate', val)}
                placeholder="Tarih seçin"
              />
            </div>
            <div className="w-[200px]">
              <DateTimePicker
                id="endDatePicker"
                label="BİTİŞ TARİHİ"
                showTime={false}
                value={toPickerValue(filters.endDate)}
                onChange={(val) => handleFilterChange('endDate', val)}
                placeholder="Tarih seçin"
              />
            </div>
            <Button
              variant="primary"
              className="h-[46px] px-6"
              onClick={applyFilters}
            >
              <Search size={18} className="mr-2" />
              FİLTRELE
            </Button>
          </div>
        </FilterSection>

        <BodySection>
          <SessionHistoryTable
            sessions={data.items || []}
            total={data.meta?.totalItems || 0}
            page={data.meta?.currentPage || 1}
            limit={data.meta?.itemsPerPage || 10}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        </BodySection>
      </main>
    </div>
  )
}
