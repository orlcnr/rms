'use client'

import { AuditLogChanges } from '../types'

interface AuditPayloadSummaryProps {
  payload?: unknown
  changes?: AuditLogChanges
}

function getObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  return null
}

export function AuditPayloadSummary({
  payload,
  changes,
}: AuditPayloadSummaryProps) {
  const payloadObject = getObject(payload)
  const metaObject = getObject(changes?.meta)

  const itemIds = Array.isArray(payloadObject?.itemIds)
    ? payloadObject?.itemIds
    : []
  const operation = (payloadObject?.operation || metaObject?.operation) as
    | string
    | undefined
  const value = getNumber(payloadObject?.value ?? metaObject?.value)
  const affectedCount = getNumber(metaObject?.affectedCount)

  const rows = [
    operation ? `İşlem: ${operation}` : null,
    itemIds.length > 0 ? `${itemIds.length} ürün seçildi` : null,
    value !== null ? `Değer: ${value}` : null,
    affectedCount !== null ? `Etkilenen ürün: ${affectedCount}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">
        Payload Özeti
      </h3>

      <div className="rounded-sm bg-bg-app p-4 text-xs text-text-secondary space-y-1">
        {rows.length ? (
          rows.map((row) => <p key={row}>{row}</p>)
        ) : (
          <p>Payload için anlamlı bir özet üretilemedi.</p>
        )}
      </div>

      <details className="rounded-sm border border-border-light">
        <summary className="cursor-pointer px-3 py-2 text-[11px] font-black uppercase tracking-wider text-text-primary">
          Gelişmiş Görünüm (Ham JSON)
        </summary>
        <pre className="max-h-60 overflow-auto border-t border-border-light bg-bg-app p-3 text-xs text-text-secondary">
          {JSON.stringify(payload ?? null, null, 2)}
        </pre>
      </details>
    </div>
  )
}

