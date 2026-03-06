'use client'

import { AuditLogChanges } from '../types'
import { getChangedFields } from '../utils/audit-diff'

interface AuditChangesPanelProps {
  changes?: AuditLogChanges
  payload?: unknown
}

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function payloadFallback(payload?: unknown): string[] {
  const payloadObject = toObject(payload)
  if (!payloadObject) {
    return ['Changes veya payload özeti bulunamadı.']
  }

  const itemCount = Array.isArray(payloadObject.itemIds)
    ? payloadObject.itemIds.length
    : null
  const operation = payloadObject.operation
  const value = payloadObject.value

  const rows = [
    operation ? `İşlem: ${String(operation)}` : null,
    itemCount !== null ? `${itemCount} ürün seçildi` : null,
    value !== undefined ? `Değer: ${String(value)}` : null,
  ].filter(Boolean) as string[]

  return rows.length ? rows : ['Changes yok, payload özeti üretilemedi.']
}

export function AuditChangesPanel({ changes, payload }: AuditChangesPanelProps) {
  const changedRows = getChangedFields(changes?.before, changes?.after)
  const meta = toObject(changes?.meta)
  const failedIds = Array.isArray(meta?.failedIds) ? meta.failedIds : []

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">
        Changes
      </h3>

      {changedRows.length > 0 ? (
        <div className="rounded-sm bg-bg-app p-4 text-xs text-text-secondary space-y-3">
          {changedRows.map((row) => (
            <div key={row.key}>
              <p className="font-black text-text-primary">{row.key}</p>
              <p>Önce: {JSON.stringify(row.before)}</p>
              <p>Sonra: {JSON.stringify(row.after)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {meta ? (
        <div className="rounded-sm bg-bg-app p-4 text-xs text-text-secondary space-y-1">
          <p>İşlem: {String(meta.operation || '-')}</p>
          <p>Hedef Kayıt: {String(meta.itemCount || 0)}</p>
          <p>Etkilenen Kayıt: {String(meta.affectedCount || 0)}</p>
          <p>Başarısız Kayıt: {failedIds.length}</p>
          {failedIds.length > 0 ? (
            <p>Örnek başarısız ID: {String(failedIds.slice(0, 3).join(', '))}</p>
          ) : null}
        </div>
      ) : null}

      {changedRows.length === 0 && !meta ? (
        <div className="rounded-sm bg-bg-app p-4 text-xs text-text-secondary space-y-1">
          {payloadFallback(payload).map((row) => (
            <p key={row}>{row}</p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

