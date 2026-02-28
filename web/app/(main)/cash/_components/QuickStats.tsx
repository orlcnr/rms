// ============================================
// QUICK STATS COMPONENT
// ============================================

import { TrendingUp, Banknote } from 'lucide-react'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import type { CashSummaryData } from '@/modules/cash/types'

interface QuickStatsProps {
  summary: CashSummaryData
}

export function QuickStats({ summary }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-bg-surface border border-border-light rounded-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-success-main/10 rounded-sm flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-success-main" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase">Bugünkü Ciro</p>
            <p className="text-lg font-bold text-text-primary">
              {formatCurrency(summary.netSales)}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-bg-surface border border-border-light rounded-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-main/10 rounded-sm flex items-center justify-center">
            <Banknote className="h-5 w-5 text-primary-main" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase">Toplam Bahşiş</p>
            <p className="text-lg font-bold text-text-primary">
              {formatCurrency(summary.totalTips)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickStats
