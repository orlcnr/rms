'use client'

import React from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  CashSession,
  CashSessionStatus,
  CASH_SESSION_STATUS_LABELS
} from '../types'
import { cn } from '@/modules/shared/utils/cn'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Pagination } from '@/modules/shared/components/Pagination'

interface SessionHistoryTableProps {
  sessions: CashSession[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  isLoading?: boolean
}

export function SessionHistoryTable({
  sessions,
  total,
  page,
  limit,
  onPageChange,
  isLoading
}: SessionHistoryTableProps) {
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])


  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-bg-app rounded-sm" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-light bg-bg-app/50">
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-muted">Tarih / Saat</th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-muted">Kasa</th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-muted">Açan Personel</th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-muted text-right">Açılış</th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-muted text-right">Kapanış</th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-muted text-right">Fark</th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-muted text-center">Durum</th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-muted text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {(sessions || []).map((session) => (
              <tr key={session.id} className="hover:bg-bg-app/30 transition-colors group">
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span suppressHydrationWarning className="text-sm font-bold text-text-primary">
                      {format(new Date(session.openedAt), 'dd MMMM yyyy', { locale: tr })}
                    </span>
                    <span suppressHydrationWarning className="text-[11px] font-medium text-text-muted">
                      {isMounted ? (
                        <>
                          {format(new Date(session.openedAt), 'HH:mm')}
                          {session.closedAt && ` - ${format(new Date(session.closedAt), 'HH:mm')}`}
                        </>
                      ) : ''}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm font-semibold text-text-primary">
                    {session.cashRegister?.name || 'Genel Kasa'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm font-medium text-text-primary">
                    {session.openedBy?.first_name} {session.openedBy?.last_name}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-mono font-bold text-text-primary">
                    {formatCurrency(session.openingBalance)}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-mono font-bold text-text-primary">
                    {session.countedBalance !== undefined ? formatCurrency(session.countedBalance) : '-'}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  {session.difference !== undefined ? (
                    <span className={cn(
                      "text-sm font-mono font-bold",
                      session.difference > 0 ? "text-success-main" : session.difference < 0 ? "text-danger-main" : "text-text-muted"
                    )}>
                      {session.difference > 0 && '+'}{formatCurrency(session.difference)}
                    </span>
                  ) : (
                    <span className="text-sm text-text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                      session.status === CashSessionStatus.OPEN
                        ? "bg-success-main/10 text-success-main"
                        : "bg-bg-muted text-text-muted"
                    )}>
                      {CASH_SESSION_STATUS_LABELS[session.status]}
                    </span>
                    {session.status === CashSessionStatus.CLOSED && session.closedWithOpenTables && (
                      <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter bg-warning-main/10 text-warning-main">
                        Açık Masayla Kapatıldı
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/cash/sessions/${session.id}`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-bg-app text-text-muted hover:bg-primary-main hover:text-white transition-all"
                  >
                    <Eye size={16} />
                  </Link>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-text-muted font-medium">
                  Kayıtlı kasa oturumu bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        totalItems={total}
        itemsPerPage={limit}
        onPageChange={onPageChange}
        currentPage={page}
      />
    </div>
  )
}
