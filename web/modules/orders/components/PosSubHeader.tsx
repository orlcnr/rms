// ============================================
// POS SUB HEADER - Products Modülü Standartlarında
// Sol: İkon + Başlık + Açıklama
// Sağ: Masa Bilgi Rozeti (readonly badge)
// ============================================

'use client'

import React from 'react'
import { LayoutGrid, CircleDot } from 'lucide-react'
import { Table } from '@/modules/tables/types'
import { cn } from '@/modules/shared/utils/cn'

interface PosSubHeaderProps {
  selectedTable: Table | null
}

/**
 * POS Sub Header - Products Modülü Standartlarında
 * - Sol: İkon + Başlık + Alt açıklama
 * - Sağ: Masa bilgisi badge olarak (readonly)
 * - Arka plan: Sayfa ile bütünleşik (transparent)
 * - Alt: İnce border
 */
export function PosSubHeader({
  selectedTable,
}: PosSubHeaderProps) {
  const tableName = selectedTable?.name ?? 'Seçilmedi'
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-light pb-4">
      {/* Sol: Başlık ve Açıklama */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {/* Dekoratif Çubuk - Products tarzı */}
          <div className="w-2 h-6 bg-primary-main rounded-full" />
          <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">
           POS TERMİNALİ
          </h1>
        </div>
        <p className="text-text-muted text-sm font-bold uppercase tracking-widest opacity-70">
Masa siparişlerini yönetin ve yeni sipariş oluşturun"        </p>
      </div>
    </div>
   
  )
}
