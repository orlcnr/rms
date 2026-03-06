'use client'

import React from 'react'
import { Button } from '@/modules/shared/components/Button'
import { Restaurant } from '@/modules/restaurants/types'

interface BranchContextBarProps {
  selectedBranch: Restaurant | null
  selectedBranchId: string
  totalItems: number
  onChangeBranch: () => void
}

export function BranchContextBar({
  selectedBranch,
  selectedBranchId,
  totalItems,
  onChangeBranch,
}: BranchContextBarProps) {
  return (
    <div className="sticky top-0 z-20 rounded-sm border border-border-light bg-bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">
            Seçili Şube
          </p>
          <p className="text-sm font-bold text-text-primary">
            {selectedBranch?.name || 'Şube bulunamadı'}
          </p>
          <p className="text-[10px] text-text-muted break-all">{selectedBranchId}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onChangeBranch}>
            ŞUBE DEĞİŞTİR
          </Button>
          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
            Toplam Sonuç: {totalItems}
          </span>
        </div>
      </div>
    </div>
  )
}

