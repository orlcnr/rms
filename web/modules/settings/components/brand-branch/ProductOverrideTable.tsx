'use client'

import React from 'react'
import { Button } from '@/modules/shared/components/Button'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { BranchManagedMenuItem } from '../../services/brand-branch.service'
import { BulkJobState } from './types'

interface ProductOverrideTableProps {
  items: BranchManagedMenuItem[]
  isItemsLoading: boolean
  selectedItemIds: Set<string>
  onSelectedItemIdsChange: (next: Set<string>) => void
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

export function ProductOverrideTable({
  items,
  isItemsLoading,
  selectedItemIds,
  onSelectedItemIdsChange,
  customPrices,
  onCustomPriceChange,
  pendingRowActions,
  pendingPriceActions,
  failedSet,
  bulkJobState,
  onSaveCustomPrice,
  onToggleRowHidden,
  onRemoveOverride,
  onRetryItem,
}: ProductOverrideTableProps) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[980px] text-left">
        <thead>
          <tr className="border-b border-border-light text-[10px] uppercase tracking-wider text-text-muted">
            <th className="py-2 pr-2">
              <input
                type="checkbox"
                checked={items.length > 0 && items.every((item) => selectedItemIds.has(item.id))}
                onChange={(event) => {
                  if (event.target.checked) {
                    onSelectedItemIdsChange(new Set(items.map((item) => item.id)))
                  } else {
                    onSelectedItemIdsChange(new Set())
                  }
                }}
              />
            </th>
            <th className="py-2 pr-2">Ürün</th>
            <th className="py-2 pr-2">Base Fiyat</th>
            <th className="py-2 pr-2">Effective Fiyat</th>
            <th className="py-2 pr-2">Custom Price</th>
            <th className="py-2 pr-2">Durum</th>
            <th className="py-2">Aksiyon</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isHidden = Boolean(item.override?.is_hidden)
            const hasFailed = failedSet.has(item.id)
            const isPendingRow = Boolean(pendingRowActions[item.id])
            const isPendingPrice = Boolean(pendingPriceActions[item.id])

            return (
              <tr
                key={item.id}
                className={`border-b border-border-light/60 text-xs ${
                  hasFailed ? 'bg-danger-bg/40' : ''
                }`}
              >
                <td className="py-3 pr-2">
                  <input
                    type="checkbox"
                    checked={selectedItemIds.has(item.id)}
                    onChange={(event) => {
                      const next = new Set(selectedItemIds)
                      if (event.target.checked) next.add(item.id)
                      else next.delete(item.id)
                      onSelectedItemIdsChange(next)
                    }}
                  />
                </td>
                <td className="py-3 pr-2">
                  <p className="font-semibold text-text-primary">{item.name}</p>
                  <p className="text-[10px] text-text-muted break-all">{item.id}</p>
                </td>
                <td className="py-3 pr-2 text-text-primary">
                  {formatCurrency(Number(item.base_price ?? item.price ?? 0))}
                </td>
                <td className="py-3 pr-2 text-text-primary">
                  {formatCurrency(Number(item.effective_price ?? item.price ?? 0))}
                </td>
                <td className="py-3 pr-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-28 rounded-sm border border-border-light bg-bg-app px-2 py-1 text-xs text-text-primary"
                    value={customPrices[item.id] || ''}
                    onChange={(event) => onCustomPriceChange(item.id, event.target.value)}
                  />
                </td>
                <td className="py-3 pr-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        isHidden ? 'bg-danger-bg text-danger-main' : 'bg-success-bg text-success-main'
                      }`}
                    >
                      {isHidden ? 'Gizli' : 'Görünür'}
                    </span>
                    {hasFailed && (
                      <span className="rounded-sm bg-danger-main/10 px-2 py-1 text-[10px] font-bold text-danger-main">
                        Hata
                      </span>
                    )}
                  </div>
                  {hasFailed && (
                    <p className="mt-1 text-[10px] text-danger-main">
                      {bulkJobState?.errorsById[item.id] || 'İşlem başarısız'}
                    </p>
                  )}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={isPendingPrice}
                      onClick={() => void onSaveCustomPrice(item.id)}
                    >
                      KAYDET
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={isPendingRow}
                      onClick={() => void onToggleRowHidden(item)}
                    >
                      {isHidden ? 'UNHIDE' : 'HIDE'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isLoading={isPendingPrice}
                      onClick={() => void onRemoveOverride(item.id)}
                    >
                      KALDIR
                    </Button>
                    {hasFailed && bulkJobState && (
                      <Button size="sm" variant="ghost" onClick={() => void onRetryItem(item.id)}>
                        TEKRAR DENE
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {!isItemsLoading && items.length === 0 && (
        <p className="py-6 text-xs text-text-muted">Ürün bulunamadı.</p>
      )}
      {isItemsLoading && <p className="py-6 text-xs text-text-muted">Şube ürünleri yükleniyor...</p>}
    </div>
  )
}
