'use client'

import { ReportEmptyState } from './ReportEmptyState'
import { AuditLogItem } from '../types'

interface AuditLogDetailPanelProps {
  log: AuditLogItem | null
  onClose: () => void
}

function prettyPrint(value: unknown) {
  if (value === null || value === undefined) {
    return 'Veri yok'
  }

  return JSON.stringify(value, null, 2)
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
            {log.action} / {log.resource}
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
        <div>
          <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-text-primary">Payload</h3>
          <pre className="max-h-80 overflow-auto rounded-sm bg-bg-app p-4 text-xs text-text-secondary">
            {prettyPrint(log.payload)}
          </pre>
        </div>

        {log.changes ? (
          <div className="grid gap-4">
            <div>
              <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-text-primary">Önce</h3>
              <pre className="max-h-36 overflow-auto rounded-sm bg-bg-app p-4 text-xs text-text-secondary">
                {prettyPrint(log.changes.before)}
              </pre>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-text-primary">Sonra</h3>
              <pre className="max-h-36 overflow-auto rounded-sm bg-bg-app p-4 text-xs text-text-secondary">
                {prettyPrint(log.changes.after)}
              </pre>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-text-primary">Changes</h3>
            <div className="rounded-sm bg-bg-app p-4 text-xs text-text-secondary">
              Bu kayıtta changes alanı bulunmuyor.
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
