// ============================================
// POS SUB HEADER - Products Modülü Standartlarında
// Sol: İkon + Başlık + Açıklama
// Sağ: Masa Bilgi Rozeti (readonly badge)
// ============================================

'use client'

import React from 'react'
import { Table } from '@/modules/tables/types'
import { cn } from '@/modules/shared/utils/cn'

interface PosSubHeaderProps {
  selectedTable: Table | null
}

/**
 * POS Sub Header - Products Modülü ile birebir aynı yapı:
 * - Sol: Turuncu çubuk + Başlık + Alt açıklama
 * - Sağ: Masa bilgisi badge
 * - Alt: border-b border-border-light pb-8
 */
export function PosSubHeader({ selectedTable }: PosSubHeaderProps) {
  const tableName = selectedTable?.name ?? null

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border-light pb-8">

      {/* Sol: Başlık */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {/* Products modülüyle aynı dekoratif çubuk */}
          <div className="w-2 h-6 bg-primary-main rounded-full" />
          <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">
            POS TERMİNALİ
          </h1>
        </div>
        <p className="text-text-muted text-sm font-bold uppercase tracking-widest opacity-70">
          Masa siparişlerini yönetin ve yeni sipariş oluşturun
        </p>
      </div>

      {/* Sağ: Masa Rozeti (seçilmişse) */}
      {tableName && (
        <div className="shrink-0">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-bg-surface border border-border-light rounded-sm">
            <span className="w-2 h-2 rounded-full bg-success-main" />
            <span className="text-xs font-black text-text-primary uppercase tracking-widest">
              MASA: {tableName}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}