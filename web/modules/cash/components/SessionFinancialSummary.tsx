'use client'

import React from 'react'
import { CashSummaryData } from '../types'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { cn } from '@/modules/shared/utils/cn'
import { getPaymentMethodLabel, PaymentMethod } from '@/modules/orders/types'
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
  const cashTipDistributed = summary.cashTipDistributed ?? 0
  const manualCashInTotal = summary.manualCashInTotal ?? 0
  const manualCashOutTotal = summary.manualCashOutTotal ?? 0
  const paymentBreakdown = summary.paymentBreakdown ?? {}
  const paymentMethods = Array.from(
    new Set<string>([...Object.values(PaymentMethod), ...Object.keys(paymentBreakdown)])
  )
  const paymentBreakdownEntries = paymentMethods.map((method) => [
    method,
    paymentBreakdown[method] || 0,
  ] as const)

  const getPaymentMethodIcon = (method: string) => {
    if (method === 'cash') {
      return <Banknote size={14} />
    }

    if (method === 'credit_card' || method === 'debit_card') {
      return <CreditCard size={14} />
    }

    return <ArrowRightLeft size={14} />
  }

  const stats = [
    {
      label: 'NET SATIŞ (CİRO)',
      value: summary.netSales,
      icon: <TrendingUp size={16} />,
      color: 'text-primary-main',
      bg: 'bg-primary-main/5'
    },
    {
      label: 'NAKİT TOPLAM',
      value: summary.totalCash,
      icon: <Banknote size={16} />,
      color: 'text-success-main',
      bg: 'bg-success-main/5',
      description: `Açılış: ${formatCurrency(openingBalance)} | Manuel Giriş: ${formatCurrency(manualCashInTotal)} | Manuel Çıkış: ${formatCurrency(manualCashOutTotal)}`
    },
    {
      label: 'TOPLAM BAHŞİŞ',
      value: summary.totalTips,
      icon: <Heart size={16} />,
      color: 'text-warning-main',
      bg: 'bg-warning-main/5',
      description: `Nakit: ${formatCurrency(summary.cashTips)} | Kasadan Dağıtılan: ${formatCurrency(cashTipDistributed)}`
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

      {paymentBreakdownEntries.length > 0 && (
        <div className="bg-white border border-border-light rounded-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border-light bg-bg-app/60">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-text-muted">
              Ödeme Tipleri
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px bg-border-light">
            {paymentBreakdownEntries.map(([method, amount]) => (
              <div key={method} className="bg-white p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-full bg-bg-app text-text-muted shrink-0">
                    {getPaymentMethodIcon(method)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-wider text-text-primary truncate">
                      {getPaymentMethodLabel(method)}
                    </p>
                    <p className="text-[10px] text-text-muted">Tahsilat kırılımı</p>
                  </div>
                </div>
                <span className="text-sm font-mono font-black text-text-primary tabular-nums shrink-0">
                  {formatCurrency(amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
