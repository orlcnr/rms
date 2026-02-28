// ============================================
// CASH SUMMARY CARD COMPONENT
// Displays 3-card summary: Net Sales, Total Tips, Cash Total
// ============================================

'use client'

import { ArrowUpRight, Wallet, Banknote } from 'lucide-react'
import { CashSummaryData } from '../types'
import { formatCurrency } from '@/modules/shared/utils/numeric'

interface CashSummaryCardProps {
  summary: CashSummaryData
  isLoading?: boolean
}

export function CashSummaryCard({ summary, isLoading }: CashSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-28 bg-bg-muted rounded-sm" />
        ))}
      </div>
    )
  }

  const { netSales, totalTips, totalCash, cashTips, cardTips } = summary

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Net Satış (Ciro) */}
      <div className="p-4 bg-success-main/5 border border-success-main/20 rounded-sm">
        <div className="flex items-center gap-2 mb-2">
          <ArrowUpRight className="h-4 w-4 text-success-main" />
          <span className="text-xs font-semibold text-success-main uppercase">
            Net Satış
          </span>
        </div>
        <span className="text-2xl font-black text-success-main">
          {formatCurrency(netSales)}
        </span>
        <span className="text-xs text-text-muted block mt-1">Ciro</span>
      </div>

      {/* Toplam Bahşiş */}
      <div className="p-4 bg-primary-main/5 border border-primary-main/20 rounded-sm">
        <div className="flex items-center gap-2 mb-2">
          <Banknote className="h-4 w-4 text-primary-main" />
          <span className="text-xs font-semibold text-primary-main uppercase">
            Toplam Bahşiş
          </span>
        </div>
        <span className="text-2xl font-black text-primary-main">
          {formatCurrency(totalTips)}
        </span>
        <div className="flex gap-2 mt-1">
          {cashTips > 0 && (
            <span className="text-xs text-text-muted">
              Nakit: {formatCurrency(cashTips)}
            </span>
          )}
          {cashTips > 0 && cardTips > 0 && (
            <span className="text-text-muted">|</span>
          )}
          {cardTips > 0 && (
            <span className="text-xs text-text-muted">
              Kart: {formatCurrency(cardTips)}
            </span>
          )}
        </div>
      </div>

      {/* Kasa Toplamı (Fiziksel) */}
      <div className="p-4 bg-warning-main/5 border border-warning-main/20 rounded-sm">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-4 w-4 text-warning-main" />
          <span className="text-xs font-semibold text-warning-main uppercase">
            Kasa Toplamı
          </span>
        </div>
        <span className="text-2xl font-black text-warning-main">
          {formatCurrency(totalCash)}
        </span>
        <span className="text-xs text-text-muted block mt-1">
          Nakit + Nakit Bahşiş
        </span>
      </div>
    </div>
  )
}

export default CashSummaryCard
