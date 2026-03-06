'use client'

import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CreateRestaurantInput } from '@/modules/restaurants/types'
import { UserRole } from '../../types'
import { BranchSelectionStep } from './BranchSelectionStep'
import { BranchOverrideStep } from './BranchOverrideStep'
import { CreateBranchModal } from './CreateBranchModal'
import { DEFAULT_BRANCH_FORM } from './types'
import { useBranchQueryState } from './hooks/useBranchQueryState'
import { useBranchSelection } from './hooks/useBranchSelection'
import { useBranchCategories } from './hooks/useBranchCategories'
import { useBranchItems } from './hooks/useBranchItems'
import { useBulkOverride } from './hooks/useBulkOverride'

interface BrandBranchTabProps {
  currentRestaurantId: string
  userRole: UserRole
}

export function BrandBranchTab({ currentRestaurantId, userRole }: BrandBranchTabProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false)
  const [newBranch, setNewBranch] = useState<CreateRestaurantInput>(DEFAULT_BRANCH_FORM)

  const canManageBranch = useMemo(
    () =>
      [
        UserRole.SUPER_ADMIN,
        UserRole.BRAND_OWNER,
        UserRole.BRANCH_MANAGER,
        UserRole.RESTAURANT_OWNER,
      ].includes(userRole),
    [userRole],
  )

  const canCreateBranch = useMemo(
    () => [UserRole.SUPER_ADMIN, UserRole.BRAND_OWNER, UserRole.RESTAURANT_OWNER].includes(userRole),
    [userRole],
  )

  const { queryState, setQuery, searchDraft, setSearchDraft } = useBranchQueryState(currentRestaurantId)
  const selection = useBranchSelection({
    canManageBranch,
    selectedBranchId: queryState.selectedBranchId,
    setQuery,
  })
  const categories = useBranchCategories({
    canManageBranch,
    selectedBranchId: queryState.selectedBranchId,
    step: queryState.step,
  })
  const items = useBranchItems({
    canManageBranch,
    selectedBranchId: queryState.selectedBranchId,
    step: queryState.step,
    page: queryState.page,
    limit: queryState.limit,
    search: queryState.search,
    categoryId: queryState.categoryId,
    visibility: queryState.visibility,
    overrideOnly: queryState.overrideOnly,
  })
  const bulk = useBulkOverride({
    selectedBranchId: queryState.selectedBranchId,
    loadItems: items.loadItems,
  })

  const getDefaultOverrideFilters = () => ({
    page: '1',
    search: null,
    categoryId: null,
    visibility: 'all',
    overrideOnly: null,
    managementTab: 'products',
  })

  async function handleCreateBranch(payload: CreateRestaurantInput) {
    if (!canCreateBranch) {
      toast.error('Şube oluşturma yetkiniz yok')
      return
    }

    setIsCreateSubmitting(true)
    try {
      const created = await selection.createBranch(payload)
      toast.success('Şube oluşturuldu')
      setIsCreateModalOpen(false)
      setNewBranch(DEFAULT_BRANCH_FORM)
      setQuery({
        step: 'overrides',
        branchId: created.id,
        ...getDefaultOverrideFilters(),
      })
    } catch {
      toast.error('Şube oluşturulamadı')
    } finally {
      setIsCreateSubmitting(false)
    }
  }

  if (!canManageBranch) {
    return (
      <div className="rounded-sm border border-border-light bg-bg-surface p-4 text-[11px] text-text-muted">
        Marka/şube ayarlarını görüntüleme yetkiniz bulunmuyor.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {queryState.step === 'branches' && (
        <BranchSelectionStep
          branches={selection.branches}
          selectedBranchId={queryState.selectedBranchId}
          isBranchLoading={selection.isBranchLoading}
          canCreateBranch={canCreateBranch}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onSelectBranch={(branchId) => setQuery({ branchId })}
          onManageSelected={() =>
            setQuery({
              step: 'overrides',
              branchId: queryState.selectedBranchId || selection.branches[0]?.id || null,
              ...getDefaultOverrideFilters(),
            })
          }
        />
      )}

      {queryState.step === 'overrides' && (
        <BranchOverrideStep
          selectedBranch={selection.selectedBranch}
          selectedBranchId={queryState.selectedBranchId}
          totalItems={items.itemsMeta.totalItems}
          onChangeBranchStep={() => setQuery({ step: 'branches' })}
          categories={categories.filteredCategories}
          isCategoryLoading={categories.isCategoryLoading}
          categoryActionLoading={categories.categoryActionLoading}
          categorySearch={categories.categorySearch}
          onCategorySearchChange={categories.setCategorySearch}
          onToggleCategory={categories.handleToggleCategory}
          managementTab={queryState.managementTab}
          onManagementTabChange={(tab) => setQuery({ managementTab: tab })}
          searchDraft={searchDraft}
          onSearchDraftChange={setSearchDraft}
          visibility={queryState.visibility}
          onVisibilityChange={(value) => setQuery({ visibility: value, page: '1' })}
          categoryId={queryState.categoryId}
          onCategoryChange={(value) => setQuery({ categoryId: value || null, page: '1' })}
          limit={queryState.limit}
          onLimitChange={(value) => setQuery({ limit: value, page: '1' })}
          overrideOnly={queryState.overrideOnly}
          onOverrideOnlyChange={(checked) =>
            setQuery({ overrideOnly: checked ? 'true' : null, page: '1' })
          }
          bulkOperation={bulk.bulkOperation}
          onBulkOperationChange={bulk.setBulkOperation}
          bulkValue={bulk.bulkValue}
          onBulkValueChange={bulk.setBulkValue}
          valueRequired={bulk.valueRequired}
          selectedItemIds={bulk.selectedItemIds}
          onSelectedItemIdsChange={bulk.setSelectedItemIds}
          isBulkApplying={bulk.isBulkApplying}
          onBulkApply={bulk.handleBulkApply}
          items={items.items}
          itemsMeta={items.itemsMeta}
          page={queryState.page}
          onPageChange={(nextPage) => setQuery({ page: String(nextPage) })}
          isItemsLoading={items.isItemsLoading}
          customPrices={items.customPrices}
          onCustomPriceChange={(itemId, value) =>
            items.setCustomPrices((state) => ({ ...state, [itemId]: value }))
          }
          pendingRowActions={items.pendingRowActions}
          pendingPriceActions={items.pendingPriceActions}
          failedSet={bulk.failedSet}
          bulkJobState={bulk.bulkJobState}
          onSaveCustomPrice={items.handleSaveCustomPrice}
          onToggleRowHidden={items.handleToggleRowHidden}
          onRemoveOverride={items.handleRemoveOverride}
          onRetryItem={bulk.handleRetryBulkForItem}
        />
      )}

      <CreateBranchModal
        isOpen={isCreateModalOpen}
        isSubmitting={isCreateSubmitting}
        canCreateBranch={canCreateBranch}
        branchForm={newBranch}
        onClose={() => setIsCreateModalOpen(false)}
        onFormChange={setNewBranch}
        onSubmit={handleCreateBranch}
      />
    </div>
  )
}
