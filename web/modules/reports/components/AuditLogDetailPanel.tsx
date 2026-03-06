'use client'

import { ReportEmptyState } from './ReportEmptyState'
import { AuditLogItem } from '../types'
import { resolveAuditActionLabel } from '../constants/audit-action-labels'
import { AuditPayloadSummary } from './AuditPayloadSummary'
import { AuditChangesPanel } from './AuditChangesPanel'

interface AuditLogDetailPanelProps {
  log: AuditLogItem | null
  onClose: () => void
}

export function AuditLogDetailPanel({
  log,
  onClose,
}: AuditLogDetailPanelProps) {
  if (!log) {
    return (
      <section className="flex h-full flex-col border-l border-border-light bg-bg-surface p-5">
        <ReportEmptyState
          title="Audit Log Detayı"
          description="Soldaki listeden bir kayıt seçerek payload ve değişim detaylarını inceleyin."
        />
      </section>
    )
  }

  return (
    <section className="flex h-full flex-col border-l border-border-light bg-bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-text-primary">Audit Log Detayı</h2>
          <p className="text-sm font-bold text-text-muted">
            {resolveAuditActionLabel(log.action)} / {log.resource}
          </p>
        </div>

        <button
          className="rounded-sm border border-border-light px-3 py-2 text-[10px] font-black uppercase tracking-wider text-text-primary transition hover:bg-bg-muted"
          type="button"
          onClick={onClose}
        >
          Kapat
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AuditPayloadSummary payload={log.payload} changes={log.changes} />
        <AuditChangesPanel changes={log.changes} payload={log.payload} />
      </div>
    </section>
  )
}
