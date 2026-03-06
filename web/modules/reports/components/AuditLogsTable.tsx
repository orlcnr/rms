'use client'

import { HydrationSafeDateTime } from './HydrationSafeDateTime'
import { ReportEmptyState } from './ReportEmptyState'
import { ReportLoadingState } from './ReportLoadingState'
import {
  AuditLogItem,
  DEFAULT_AUDIT_PAGE_SIZE_OPTIONS,
  PaginationMeta,
} from '../types'
import { resolveAuditActionLabel } from '../constants/audit-action-labels'

interface AuditLogsTableProps {
  items: AuditLogItem[]
  meta: PaginationMeta
  isLoading: boolean
  selectedLogId?: string
  onSelect: (log: AuditLogItem) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (limit: number) => void
}

export function AuditLogsTable({
  items,
  meta,
  isLoading,
  selectedLogId,
  onSelect,
  onPageChange,
  onPageSizeChange,
}: AuditLogsTableProps) {
  const canGoPrev = meta.currentPage > 1
  const canGoNext = meta.currentPage < Math.max(meta.totalPages, 1)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-border-light text-sm">
          <thead className="sticky top-0 z-10 bg-bg-surface text-left text-text-secondary">
            <tr>
              <th className="border-b border-border-light px-4 py-3 text-[11px] font-black uppercase tracking-wider">Zaman</th>
              <th className="border-b border-border-light px-4 py-3 text-[11px] font-black uppercase tracking-wider">Kullanıcı</th>
              <th className="border-b border-border-light px-4 py-3 text-[11px] font-black uppercase tracking-wider">Aksiyon</th>
              <th className="border-b border-border-light px-4 py-3 text-[11px] font-black uppercase tracking-wider">Kaynak</th>
              <th className="border-b border-border-light px-4 py-3 text-[11px] font-black uppercase tracking-wider">IP</th>
              <th className="border-b border-border-light px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {isLoading ? (
              <tr>
                <td className="px-4 py-6" colSpan={6}>
                  <ReportLoadingState message="Audit loglar yükleniyor..." />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan={6}>
                  <ReportEmptyState
                    title="Kayıt Bulunamadı"
                    description="Seçilen filtrelere ait audit log bulunamadı."
                  />
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className={selectedLogId === item.id ? 'bg-primary-subtle/30' : ''}
                >
                  <td className="px-4 py-3 text-text-primary">
                    <HydrationSafeDateTime value={item.timestamp} />
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    {item.user_name || item.user_id || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-sm bg-bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-text-primary">
                      {resolveAuditActionLabel(item.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{item.resource}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {item.ip_address || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="rounded-sm border border-border-light px-3 py-2 text-[10px] font-black uppercase tracking-wider text-text-primary transition hover:bg-bg-muted"
                      type="button"
                      onClick={() => onSelect(item)}
                    >
                      Detay
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border-light px-4 py-4 text-sm text-text-secondary md:flex-row md:items-center md:justify-between">
        <div>
          Toplam {meta.totalItems} kayıt, sayfa {meta.currentPage} / {Math.max(meta.totalPages, 1)}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span>Sayfa Boyutu</span>
            <select
              className="rounded-sm border border-border-light bg-bg-surface px-2 py-1 text-text-primary"
              value={meta.itemsPerPage}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {DEFAULT_AUDIT_PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <button
            className="rounded-sm border border-border-light px-3 py-2 text-[10px] font-black uppercase tracking-wider text-text-primary transition hover:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => onPageChange(meta.currentPage - 1)}
            disabled={!canGoPrev || isLoading}
          >
            Önceki
          </button>

          <button
            className="rounded-sm border border-border-light px-3 py-2 text-[10px] font-black uppercase tracking-wider text-text-primary transition hover:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => onPageChange(meta.currentPage + 1)}
            disabled={!canGoNext || isLoading}
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  )
}
