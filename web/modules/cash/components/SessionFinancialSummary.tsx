'use client'

import React from 'react'
import { CashSummaryData } from '../types'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { cn } from '@/modules/shared/utils/cn'
import { 
  TrendingUp, 
  CreditCard, 
  Banknote, 
  Heart, 
  Scale,
  ArrowRightLeft
} from 'lucide-react'

interface SessionFinancialSummaryProps {
  summary: CashSummaryData
  openingBalance: number
  countedBalance?: number
  isLoading?: boolean
}

export function SessionFinancialSummary({
  summary,
  openingBalance,
  countedBalance,
  isLoading
}: SessionFinancialSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-bg-app rounded-sm border border-border-light" />
        ))}
      </div>
    )
  }

  const difference = countedBalance !== undefined ? countedBalance - summary.totalCash : 0

  const stats = [
    {
      label: 'NET SATIŞ (CİRO)',
      value: summary.netSales,
      icon: <TrendingUp size={16} />,
      color: 'text-primary-main',
      bg: 'bg-primary-main/5'
    },
    {
      label: 'KREDİ KARTI',
      value: summary.paymentBreakdown?.['credit_card'] || 0,
      icon: <CreditCard size={16} />,
      color: 'text-info-main',
      bg: 'bg-info-main/5'
    },
    {
      label: 'NAKİT TOPLAM',
      value: summary.totalCash,
      icon: <Banknote size={16} />,
      color: 'text-success-main',
      bg: 'bg-success-main/5',
      description: `Açılış: ${formatCurrency(openingBalance)}`
    },
    {
      label: 'TOPLAM BAHŞİŞ',
      value: summary.totalTips,
      icon: <Heart size={16} />,
      color: 'text-warning-main',
      bg: 'bg-warning-main/5',
      description: `Nakit: ${formatCurrency(summary.cashTips)}`
    },
    {
      label: 'SAYILAN NAKİT',
      value: countedBalance || 0,
      icon: <Scale size={16} />,
      color: 'text-warning-main',
      bg: 'bg-warning-main/5'
    },
    {
      label: 'KASA FARKI',
      value: difference,
      icon: <ArrowRightLeft size={16} />,
      color: difference > 0 ? 'text-success-main' : difference < 0 ? 'text-danger-main' : 'text-text-muted',
      bg: difference > 0 ? 'bg-success-main/5' : difference < 0 ? 'bg-danger-main/5' : 'bg-bg-app',
      isDifference: true
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <div 
          key={index} 
          className={cn(
            "p-4 rounded-sm border border-border-light flex flex-col justify-between transition-all hover:shadow-sm",
            stat.bg
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-text-muted">
              {stat.label}
            </span>
            <div className={cn("p-1.5 rounded-full", stat.color, "bg-white shadow-sm")}>
              {stat.icon}
            </div>
          </div>
          <div className="flex flex-col">
            <span className={cn(
              "text-xl font-mono font-black tabular-nums",
              stat.color
            )}>
              {stat.value > 0 && stat.isDifference && '+'}{formatCurrency(stat.value)}
            </span>
            {stat.description && (
              <span className="text-[10px] font-bold text-text-muted mt-1">
                {stat.description}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
