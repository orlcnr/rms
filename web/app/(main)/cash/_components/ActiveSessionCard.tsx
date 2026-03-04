// ============================================
// ACTIVE SESSION CARD COMPONENT
// ============================================

'use client'

import { Lock, Unlock } from 'lucide-react'

interface ActiveSessionCardProps {
  activeSessionCount: number
}

export function ActiveSessionCard({
  activeSessionCount,
}: ActiveSessionCardProps) {
  if (activeSessionCount > 0) {
    return (
      <div className="bg-success-main/5 border border-success-main/20 rounded-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-success-main/10 rounded-full flex items-center justify-center">
            <Unlock className="h-5 w-5 text-success-main" />
          </div>
          <div>
            <p className="text-sm font-black text-success-main uppercase tracking-tight">
              {activeSessionCount} AÇIK KASA OTURUMU
            </p>
            <p className="text-xs text-text-muted">
              Hangi kasayı kapatacağınızı aşağıdaki listeden seçin.
            </p>
          </div>
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
