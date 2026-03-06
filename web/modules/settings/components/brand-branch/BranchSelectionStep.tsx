'use client'

import React from 'react'
import { Button } from '@/modules/shared/components/Button'
import { Restaurant } from '@/modules/restaurants/types'

interface BranchSelectionStepProps {
  branches: Restaurant[]
  selectedBranchId: string
  isBranchLoading: boolean
  canCreateBranch: boolean
  onOpenCreateModal: () => void
  onSelectBranch: (branchId: string) => void
  onManageSelected: () => void
}

export function BranchSelectionStep({
  branches,
  selectedBranchId,
  isBranchLoading,
  canCreateBranch,
  onOpenCreateModal,
  onSelectBranch,
  onManageSelected,
}: BranchSelectionStepProps) {
  return (
    <div className="rounded-sm border border-border-light bg-bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
          Şube Seç / Oluştur
        </h3>
        <Button onClick={onOpenCreateModal} disabled={!canCreateBranch}>
          YENİ ŞUBE EKLE
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {branches.map((branch) => (
          <button
            key={branch.id}
            className={`rounded-sm border px-3 py-3 text-left transition-colors ${
              selectedBranchId === branch.id
                ? 'border-primary-main bg-primary-main/10'
                : 'border-border-light bg-bg-app hover:border-primary-main/40'
            }`}
            onClick={() => onSelectBranch(branch.id)}
          >
            <p className="text-[11px] font-black uppercase tracking-wider text-text-primary">
              {branch.name}
            </p>
            <p className="mt-1 text-[10px] text-text-muted break-all">{branch.id}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={onManageSelected} disabled={!selectedBranchId && branches.length === 0}>
          SEÇİLİ ŞUBEYİ YÖNET
        </Button>
      </div>

      {branches.length === 0 && !isBranchLoading && (
        <p className="mt-3 text-xs text-text-muted">Şube kaydı bulunamadı.</p>
      )}
    </div>
  )
}

