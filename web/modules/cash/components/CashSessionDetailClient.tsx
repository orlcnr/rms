'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  SubHeaderSection,
  BodySection
} from '@/modules/shared/components/layout'
import {
  CashSession,
  CashMovement,
  CashSummaryData
} from '../types'
import { SessionMovementTable } from './SessionMovementTable'
import { SessionFinancialSummary } from './SessionFinancialSummary'
import { ReconciliationReportView } from './ReconciliationReportView'
import { Button } from '@/modules/shared/components/Button'
import { ArrowLeft, Printer, FileText, ClipboardCheck } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { cashApi } from '../services'
import { ReconciliationReport } from '../types'
import { toast } from 'sonner'
import { cn } from '@/modules/shared/utils/cn'

interface CashSessionDetailClientProps {
  session: CashSession
  movements: CashMovement[]
  summary: CashSummaryData
}

export function CashSessionDetailClient({
  session,
  movements,
  summary
}: CashSessionDetailClientProps) {
  const router = useRouter()
  const [isMounted, setIsMounted] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<'summary' | 'reconciliation'>('summary')
  const [reconciliationReport, setReconciliationReport] = React.useState<ReconciliationReport | null>(null)
  const [isReportLoading, setIsReportLoading] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const fetchReconciliationReport = async () => {
    if (reconciliationReport) return
    setIsReportLoading(true)
    try {
      const data = await cashApi.getReconciliationReport(session.id)
      setReconciliationReport(data)
    } catch (err) {
      console.error('Mutabakat raporu yüklenemedi:', err)
      toast.error('Mutabakat raporu yüklenemedi')
    } finally {
      setIsReportLoading(false)
    }
  }

  React.useEffect(() => {
    if (viewMode === 'reconciliation') {
      fetchReconciliationReport()
    }
  }, [viewMode])

  const handlePrint = () => {
    window.print()
  }

  const formattedOpenedAt = isMounted
    ? format(new Date(session.openedAt), 'dd MMMM yyyy HH:mm', { locale: tr })
    : 'Yükleniyor...'

  return (
    <div className="flex flex-col min-h-screen bg-bg-app print:bg-white">
      <div className="print:hidden">
        <SubHeaderSection
          title={`KASA OTURUMU: ${session.cashRegister?.name || 'GENEL KASA'}`}
          description={`${formattedOpenedAt} tarihinde açıldı`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft size={16} className="mr-2" />
                GERİ DÖN
              </Button>
              <Button variant="primary" onClick={handlePrint}>
                <Printer size={16} className="mr-2" />
                YAZDIR / PDF
              </Button>
            </div>
          }
        />
      </div>

      <main className="flex flex-col flex-1 pb-6 min-h-0 px-layout print:px-0 print:pb-0">
        {/* Financial Summary & Reconciliation Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-1.5 h-4 rounded-full",
                viewMode === 'summary' ? "bg-warning-main" : "bg-primary-main"
              )} />
              <h2 className="text-sm font-black text-text-primary uppercase tracking-[0.15em]">
                {viewMode === 'summary' ? 'FİNANSAL ÖZET' : 'TAM MUTABAKAT RAPORU'}
              </h2>
            </div>

            <div className="flex bg-white border border-border-light rounded-sm p-1">
              <button
                onClick={() => setViewMode('summary')}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-sm transition-all flex items-center gap-2",
                  viewMode === 'summary'
                    ? "bg-bg-app text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                <FileText size={12} />
                ÖZET
              </button>
              <button
                onClick={() => setViewMode('reconciliation')}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-sm transition-all flex items-center gap-2",
                  viewMode === 'reconciliation'
                    ? "bg-bg-app text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                <ClipboardCheck size={12} />
                TAM MUTABAKAT
              </button>
            </div>
          </div>

          {viewMode === 'summary' ? (
            <SessionFinancialSummary
              summary={summary}
              openingBalance={session.openingBalance}
              countedBalance={session.countedBalance}
            />
          ) : (
            <ReconciliationReportView
              report={reconciliationReport}
              isLoading={isReportLoading}
            />
          )}
        </div>

        {/* Movements Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-4 bg-success-main rounded-full" />
            <h2 className="text-sm font-black text-text-primary uppercase tracking-[0.15em]">
              OTURUM HAREKETLERİ
            </h2>
          </div>
          <BodySection className="flex-1 overflow-hidden">
            <SessionMovementTable movements={movements} />
          </BodySection>
        </div>

        {/* Print Only Header */}
        <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold uppercase">KASA MUTABAKAT RAPORU</h1>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p><strong>Kasa:</strong> {session.cashRegister?.name || 'Genel Kasa'}</p>
              <p suppressHydrationWarning><strong>Açılış:</strong> {format(new Date(session.openedAt), 'dd.MM.yyyy HH:mm')}</p>
              <p suppressHydrationWarning><strong>Kapanış:</strong> {session.closedAt ? format(new Date(session.closedAt), 'dd.MM.yyyy HH:mm') : 'AÇIK'}</p>
            </div>
            <div>
              <p><strong>Açan:</strong> {session.openedBy?.first_name} {session.openedBy?.last_name}</p>
              <p><strong>Kapatan:</strong> {session.closedBy?.first_name} {session.closedBy?.last_name || '-'}</p>
              <p suppressHydrationWarning><strong>Rapor Tarihi:</strong> {format(new Date(), 'dd.MM.yyyy HH:mm')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
