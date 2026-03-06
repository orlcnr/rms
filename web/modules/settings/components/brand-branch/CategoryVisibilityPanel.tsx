'use client'

import React from 'react'
import { Button } from '@/modules/shared/components/Button'
import { FormInput } from '@/modules/shared/components/FormInput'
import { BranchCategoryVisibilityItem } from '../../services/brand-branch.service'

interface CategoryVisibilityPanelProps {
  categories: BranchCategoryVisibilityItem[]
  isCategoryLoading: boolean
  categoryActionLoading: Record<string, boolean>
  categorySearch: string
  onCategorySearchChange: (value: string) => void
  onToggleCategory: (category: BranchCategoryVisibilityItem) => Promise<void>
}

export function CategoryVisibilityPanel({
  categories,
  isCategoryLoading,
  categoryActionLoading,
  categorySearch,
  onCategorySearchChange,
  onToggleCategory,
}: CategoryVisibilityPanelProps) {
  return (
    <div className="rounded-sm border border-border-light bg-bg-surface p-4">
      <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
        Kategori Görünürlük Yönetimi
      </h3>

      <div className="mt-3 w-full md:w-80">
        <FormInput
          id="branch_category_search"
          name="branch_category_search"
          label="Kategori Ara"
          value={categorySearch}
          onChange={onCategorySearchChange}
        />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-border-light text-[10px] uppercase tracking-wider text-text-muted">
              <th className="py-2 pr-2">Kategori</th>
              <th className="py-2 pr-2">Durum</th>
              <th className="py-2">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.categoryId} className="border-b border-border-light/60 text-xs">
                <td className="py-3 pr-2">
                  <p className="font-semibold text-text-primary">{category.name}</p>
                  <p className="text-[10px] text-text-muted break-all">{category.categoryId}</p>
                </td>
                <td className="py-3 pr-2">
                  <span
                    className={`rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      category.isHiddenInBranch
                        ? 'bg-danger-bg text-danger-main'
                        : 'bg-success-bg text-success-main'
                    }`}
                  >
                    {category.isHiddenInBranch ? 'Gizli' : 'Açık'}
                  </span>
                </td>
                <td className="py-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onToggleCategory(category)}
                    isLoading={Boolean(categoryActionLoading[category.categoryId])}
                  >
                    {category.isHiddenInBranch ? 'KATEGORİYİ AÇ' : 'KATEGORİYİ KAPAT'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isCategoryLoading && categories.length === 0 && (
          <p className="py-6 text-xs text-text-muted">Kategori bulunamadı.</p>
        )}
        {isCategoryLoading && (
          <p className="py-6 text-xs text-text-muted">Kategori listesi yükleniyor...</p>
        )}
      </div>
    </div>
  )
}

