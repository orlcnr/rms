'use client'

import React from 'react'
import { Button } from '@/modules/shared/components/Button'
import {
  BranchBulkOperation,
  BranchCategoryVisibilityItem,
  BranchManagedMenuItem,
} from '../../services/brand-branch.service'
import { BulkJobState } from './types'
import { ProductOverrideFilters } from './ProductOverrideFilters'
import { ProductOverrideTable } from './ProductOverrideTable'

interface ProductOverridePanelProps {
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

export function ProductOverridePanel(props: ProductOverridePanelProps) {
  return (
    <div className="rounded-sm border border-border-light bg-bg-surface p-4">
      <ProductOverrideFilters
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
        selectedCount={props.selectedItemIds.size}
        isBulkApplying={props.isBulkApplying}
        onBulkApply={props.onBulkApply}
      />

      <ProductOverrideTable
        items={props.items}
        isItemsLoading={props.isItemsLoading}
        selectedItemIds={props.selectedItemIds}
        onSelectedItemIdsChange={props.onSelectedItemIdsChange}
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

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] text-text-muted">
          Sayfa {props.itemsMeta.currentPage} / {Math.max(1, props.itemsMeta.totalPages)}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={props.itemsMeta.currentPage <= 1}
            onClick={() => props.onPageChange(Math.max(1, props.page - 1))}
          >
            ÖNCEKİ
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={props.itemsMeta.currentPage >= props.itemsMeta.totalPages}
            onClick={() =>
              props.onPageChange(
                Math.min(Math.max(1, props.itemsMeta.totalPages), props.itemsMeta.currentPage + 1),
              )
            }
          >
            SONRAKİ
          </Button>
        </div>
      </div>
    </div>
  )
}

