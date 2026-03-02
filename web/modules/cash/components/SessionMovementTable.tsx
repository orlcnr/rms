'use client'

import React from 'react'
import { format } from 'date-fns'
import {
  CashMovement,
  CashMovementType,
  CASH_MOVEMENT_TYPE_LABELS
} from '../types'
import { PaymentMethod, PAYMENT_METHOD_LABELS } from '@/modules/orders/types'
import { cn } from '@/modules/shared/utils/cn'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { ArrowDownRight, ArrowUpRight, ShoppingCart, Wallet } from 'lucide-react'

interface SessionMovementTableProps {
  movements: CashMovement[]
  isLoading?: boolean
}

export function SessionMovementTable({
  movements,
  isLoading
}: SessionMovementTableProps) {
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-bg-app rounded-sm" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-light bg-bg-app/50 sticky top-0 z-10">
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-text-muted">Saat</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-text-muted">İşlem</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-text-muted">Yöntem</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-text-muted">Açıklama</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-text-muted text-right">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {(movements || []).map((movement) => (
              <tr key={movement.id} className="hover:bg-bg-app/30 transition-colors group">
                <td className="px-4 py-3">
                  <span suppressHydrationWarning className="text-xs font-mono font-bold text-text-muted">
                    {format(new Date(movement.created_at), 'HH:mm:ss')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      movement.type === CashMovementType.SALE ? "bg-success-main/10 text-success-main" :
                        movement.type === CashMovementType.IN ? "bg-info-main/10 text-info-main" :
                          "bg-danger-main/10 text-danger-main"
                    )}>
                      {movement.type === CashMovementType.SALE ? <ShoppingCart size={12} /> :
                        movement.type === CashMovementType.IN ? <ArrowUpRight size={12} /> :
                          <ArrowDownRight size={12} />}
                    </div>
                    <span className="text-xs font-black uppercase tracking-tighter text-text-primary">
                      {CASH_MOVEMENT_TYPE_LABELS[movement.type]}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Wallet size={12} className="text-text-muted" />
                    <span className="text-xs font-bold uppercase tracking-tighter text-text-muted">
                      {PAYMENT_METHOD_LABELS[movement.paymentMethod as PaymentMethod]}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-text-primary">
                    {movement.description}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={cn(
                    "text-sm font-mono font-black",
                    movement.type === CashMovementType.OUT ? "text-danger-main" : "text-text-primary"
                  )}>
                    {movement.type === CashMovementType.OUT ? '-' : '+'}{formatCurrency(movement.amount)}
                  </span>
                </td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-muted font-medium">
                  Bu oturumda henüz bir hareket bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
