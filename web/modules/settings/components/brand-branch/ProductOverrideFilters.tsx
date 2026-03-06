'use client'

import React from 'react'
import { FormInput } from '@/modules/shared/components/FormInput'
import { BranchBulkOperation, BranchCategoryVisibilityItem } from '../../services/brand-branch.service'

interface ProductOverrideFiltersProps {
  searchDraft: string
  onSearchDraftChange: (value: string) => void
  visibility: 'all' | 'visible' | 'hidden'
  onVisibilityChange: (value: string) => void
  categoryId: string
  categories: BranchCategoryVisibilityItem[]
  onCategoryChange: (value: string) => void
  limit: number
  onLimitChange: (value: string) => void
  overrideOnly: boolean
  onOverrideOnlyChange: (checked: boolean) => void
  bulkOperation: BranchBulkOperation
  onBulkOperationChange: (value: BranchBulkOperation) => void
  bulkValue: string
  onBulkValueChange: (value: string) => void
  valueRequired: Set<BranchBulkOperation>
  selectedCount: number
  isBulkApplying: boolean
  onBulkApply: () => Promise<unknown>
}

export function ProductOverrideFilters({
  searchDraft,
  onSearchDraftChange,
  visibility,
  onVisibilityChange,
  categoryId,
  categories,
  onCategoryChange,
  limit,
  onLimitChange,
  overrideOnly,
  onOverrideOnlyChange,
  bulkOperation,
  onBulkOperationChange,
  bulkValue,
  onBulkValueChange,
  valueRequired,
  selectedCount,
  isBulkApplying,
  onBulkApply,
}: ProductOverrideFiltersProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <FormInput
            id="menu_search"
            name="menu_search"
            label="Ürün Ara"
            value={searchDraft}
            onChange={onSearchDraftChange}
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-text-muted">Durum</label>
          <select
            className="mt-1 h-10 w-full rounded-sm border border-border-light bg-bg-app px-2 text-xs"
            value={visibility}
            onChange={(event) => onVisibilityChange(event.target.value)}
          >
            <option value="all">Tümü</option>
            <option value="visible">Görünür</option>
            <option value="hidden">Gizli</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-text-muted">Kategori</label>
          <select
            className="mt-1 h-10 w-full rounded-sm border border-border-light bg-bg-app px-2 text-xs"
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            <option value="">Tümü</option>
            {categories.map((category) => (
              <option key={category.categoryId} value={category.categoryId}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-text-muted">Sayfa Boyutu</label>
          <select
            className="mt-1 h-10 w-full rounded-sm border border-border-light bg-bg-app px-2 text-xs"
            value={limit}
            onChange={(event) => onLimitChange(event.target.value)}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={overrideOnly}
              onChange={(event) => onOverrideOnlyChange(event.target.checked)}
            />
            Sadece Override
          </label>
        </div>
      </div>

      <div className="mt-4 rounded-sm border border-border-light bg-bg-app p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-text-muted">
              Toplu İşlem
            </label>
            <select
              className="mt-1 h-10 w-full rounded-sm border border-border-light bg-bg-surface px-2 text-xs"
              value={bulkOperation}
              onChange={(event) => onBulkOperationChange(event.target.value as BranchBulkOperation)}
            >
              <option value="set_price">Sabit Fiyat Ata</option>
              <option value="increase_amount">+ Tutar</option>
              <option value="decrease_amount">- Tutar</option>
              <option value="increase_percent">% Artır</option>
              <option value="decrease_percent">% Azalt</option>
              <option value="hide">Gizle</option>
              <option value="unhide">Gizliyi Aç</option>
              <option value="clear_override">Override Kaldır</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-text-muted">
              Değer
            </label>
            <input
              type="number"
              step="0.01"
              className="mt-1 h-10 w-full rounded-sm border border-border-light bg-bg-surface px-2 text-xs"
              value={bulkValue}
              onChange={(event) => onBulkValueChange(event.target.value)}
              disabled={!valueRequired.has(bulkOperation)}
            />
          </div>

          <div className="md:col-span-2 flex items-end text-xs text-text-muted">
            Seçili ürün: {selectedCount}
          </div>

          <div className="flex items-end justify-end">
            <button
              className="inline-flex h-9 items-center rounded-sm bg-primary-main px-3 text-[11px] font-black uppercase tracking-wider text-text-inverse disabled:opacity-40"
              onClick={() => void onBulkApply()}
              disabled={selectedCount === 0 || isBulkApplying}
            >
              {isBulkApplying ? 'UYGULANIYOR...' : 'TOPLU UYGULA'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
