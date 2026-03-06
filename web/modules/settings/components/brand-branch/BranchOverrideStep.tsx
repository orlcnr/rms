'use client'

import React from 'react'
import { Restaurant } from '@/modules/restaurants/types'
import {
  BranchBulkOperation,
  BranchCategoryVisibilityItem,
  BranchManagedMenuItem,
} from '../../services/brand-branch.service'
import { BranchContextBar } from './BranchContextBar'
import { CategoryVisibilityPanel } from './CategoryVisibilityPanel'
import { ProductOverridePanel } from './ProductOverridePanel'
import { BranchManagementTab, BulkJobState } from './types'

interface BranchOverrideStepProps {
  selectedBranch: Restaurant | null
  selectedBranchId: string
  totalItems: number
  onChangeBranchStep: () => void
  categories: BranchCategoryVisibilityItem[]
  isCategoryLoading: boolean
  categoryActionLoading: Record<string, boolean>
  categorySearch: string
  onCategorySearchChange: (value: string) => void
  onToggleCategory: (category: BranchCategoryVisibilityItem) => Promise<void>
  managementTab: BranchManagementTab
  onManagementTabChange: (tab: BranchManagementTab) => void
  searchDraft: string
  onSearchDraftChange: (value: string) => void
  visibility: 'all' | 'visible' | 'hidden'
  onVisibilityChange: (value: string) => void
  categoryId: string
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
  selectedItemIds: Set<string>
  onSelectedItemIdsChange: (next: Set<string>) => void
  isBulkApplying: boolean
  onBulkApply: () => Promise<unknown>
  items: BranchManagedMenuItem[]
  itemsMeta: {
    currentPage: number
    totalPages: number
    totalItems: number
  }
  page: number
  onPageChange: (page: number) => void
  isItemsLoading: boolean
  customPrices: Record<string, string>
  onCustomPriceChange: (itemId: string, value: string) => void
  pendingRowActions: Record<string, boolean>
  pendingPriceActions: Record<string, boolean>
  failedSet: Set<string>
  bulkJobState: BulkJobState | null
  onSaveCustomPrice: (itemId: string) => Promise<unknown>
  onToggleRowHidden: (item: BranchManagedMenuItem) => Promise<unknown>
  onRemoveOverride: (itemId: string) => Promise<unknown>
  onRetryItem: (itemId: string) => Promise<unknown>
}

export function BranchOverrideStep(props: BranchOverrideStepProps) {
  return (
    <>
      <BranchContextBar
        selectedBranch={props.selectedBranch}
        selectedBranchId={props.selectedBranchId}
        totalItems={props.totalItems}
        onChangeBranch={props.onChangeBranchStep}
      />

      <div className="rounded-sm border border-border-light bg-bg-surface p-2">
        <div className="flex items-center gap-2">
          <button
            className={`rounded-sm border px-3 py-2 text-[10px] font-black uppercase tracking-wider ${
              props.managementTab === 'products'
                ? 'border-primary-main bg-primary-main text-text-inverse'
                : 'border-border-light text-text-secondary'
            }`}
            onClick={() => props.onManagementTabChange('products')}
          >
            Ürün Yönetimi
          </button>
          <button
            className={`rounded-sm border px-3 py-2 text-[10px] font-black uppercase tracking-wider ${
              props.managementTab === 'categories'
                ? 'border-primary-main bg-primary-main text-text-inverse'
                : 'border-border-light text-text-secondary'
            }`}
            onClick={() => props.onManagementTabChange('categories')}
          >
            Kategori Yönetimi
          </button>
        </div>
      </div>

      {props.managementTab === 'categories' && (
        <CategoryVisibilityPanel
          categories={props.categories}
          isCategoryLoading={props.isCategoryLoading}
          categoryActionLoading={props.categoryActionLoading}
          categorySearch={props.categorySearch}
          onCategorySearchChange={props.onCategorySearchChange}
          onToggleCategory={props.onToggleCategory}
        />
      )}

      {props.managementTab === 'products' && (
        <ProductOverridePanel
          searchDraft={props.searchDraft}
          onSearchDraftChange={props.onSearchDraftChange}
          visibility={props.visibility}
          onVisibilityChange={props.onVisibilityChange}
          categoryId={props.categoryId}
          categories={props.categories}
          onCategoryChange={props.onCategoryChange}
          limit={props.limit}
          onLimitChange={props.onLimitChange}
          overrideOnly={props.overrideOnly}
          onOverrideOnlyChange={props.onOverrideOnlyChange}
          bulkOperation={props.bulkOperation}
          onBulkOperationChange={props.onBulkOperationChange}
          bulkValue={props.bulkValue}
          onBulkValueChange={props.onBulkValueChange}
          valueRequired={props.valueRequired}
          selectedItemIds={props.selectedItemIds}
          onSelectedItemIdsChange={props.onSelectedItemIdsChange}
          isBulkApplying={props.isBulkApplying}
          onBulkApply={props.onBulkApply}
          items={props.items}
          itemsMeta={props.itemsMeta}
          page={props.page}
          onPageChange={props.onPageChange}
          isItemsLoading={props.isItemsLoading}
          customPrices={props.customPrices}
          onCustomPriceChange={props.onCustomPriceChange}
          pendingRowActions={props.pendingRowActions}
          pendingPriceActions={props.pendingPriceActions}
          failedSet={props.failedSet}
          bulkJobState={props.bulkJobState}
          onSaveCustomPrice={props.onSaveCustomPrice}
          onToggleRowHidden={props.onToggleRowHidden}
          onRemoveOverride={props.onRemoveOverride}
          onRetryItem={props.onRetryItem}
        />
      )}
    </>
  )
}
