// ============================================
// ACTIVE SESSION CARD COMPONENT
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { Button } from '@/modules/shared/components/Button'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { formatDate } from '@/modules/shared/utils/date'
import type { ActiveSessionWrapper, CashSummaryData } from '@/modules/cash/types'

interface ActiveSessionCardProps {
  session: ActiveSessionWrapper | null
  isOpen: boolean
  onOpenClose: () => void
  summary: CashSummaryData
}

export function ActiveSessionCard({
  session,
  isOpen,
  onOpenClose,
  summary,
}: ActiveSessionCardProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatSessionDate = (dateStr: string | undefined) => {
    if (!dateStr || !mounted) return '-'
    try {
      return formatDate(dateStr, 'datetime')
    } catch {
      return '-'
    }
  }

  if (session) {
    return (
      <div className="bg-success-main/5 border border-success-main/20 rounded-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-main/10 rounded-full flex items-center justify-center">
              <Unlock className="h-5 w-5 text-success-main" />
            </div>
            <div>
              <p className="text-sm font-black text-success-main uppercase tracking-tight">
                {session.register?.name || 'KASA'} AÇIK
              </p>
              <p className="text-xs text-text-muted">
                Açılış: {formatCurrency(session.session.openingBalance)} •{' '}
                {formatSessionDate(session.session.openedAt)}
              </p>
            </div>
          </div>
          <Button variant="primary" onClick={onOpenClose}>
            Kasayı Kapat
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-warning-main/5 border border-warning-main/20 rounded-sm p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-warning-main/10 rounded-full flex items-center justify-center">
          <Lock className="h-5 w-5 text-warning-main" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-warning-main">Kasa Kapalı</p>
          <p className="text-xs text-text-muted">
            Kasa işlemleri için kasa oturumu açmanız gerekiyor
          </p>
        </div>
      </div>
    </div>
  )
}

export default ActiveSessionCard
