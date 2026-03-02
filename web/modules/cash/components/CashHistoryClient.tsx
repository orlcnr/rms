'use client'

import React, { useState, useEffect } from 'react'
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

interface CashHistoryClientProps {
  initialData: PaginatedResponse<CashSession> | CashSession[]
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

  // Handle both paginated and non-paginated initial data
  const normalizedData = Array.isArray(initialData)
    ? {
      items: initialData,
      meta: {
        totalItems: initialData.length,
        itemCount: initialData.length,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1
      }
    }
    : initialData

  const [data, setData] = useState<PaginatedResponse<CashSession>>(normalizedData)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState(initialFilters)

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

  const handlePageChange = (page: number) => {
    updateQueryParams({ page })
  }

  const handleFilterChange = (key: keyof CashSessionHistoryFilters, value: any) => {
    const newFilters = { ...filters, [key]: value, page: 1 }
    setFilters(newFilters)
    // We don't call updateQueryParams here to avoid too many refreshes while typing
  }

  const applyFilters = () => {
    updateQueryParams(filters)
  }

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
              <FormInput
                id="startDate"
                name="startDate"
                label="BAŞLANGIÇ TARİHİ"
                type="date"
                placeholder="YYYY-MM-DD"
                value={filters.startDate || ''}
                onChange={(val) => handleFilterChange('startDate', val)}
              />
            </div>
            <div className="w-[200px]">
              <FormInput
                id="endDate"
                name="endDate"
                label="BİTİŞ TARİHİ"
                type="date"
                placeholder="YYYY-MM-DD"
                value={filters.endDate || ''}
                onChange={(val) => handleFilterChange('endDate', val)}
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
