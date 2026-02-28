'use client'

import { useMemo, useState } from 'react'
import { Check, AlertCircle, Users, LayoutGrid } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'
import { Table, TableStatus } from '@/modules/tables/types'

// ============================================
// INTERFACE
// ============================================

interface TableSelectorProps {
  tables: Table[]
  selectedTableId?: string
  onSelect: (tableId: string) => void
  busyTableIds?: string[] // Tables that are busy at selected time
  error?: string
  disabled?: boolean
}

// ============================================
// COMPONENT
// ============================================

export function TableSelector({
  tables,
  selectedTableId,
  onSelect,
  busyTableIds = [],
  error,
  disabled = false,
}: TableSelectorProps) {
  const [activeArea, setActiveArea] = useState<string>('all')

  // Areas list
  const areas = useMemo(() => {
    const uniqueAreas = Array.from(new Set(tables.map(t => t.area?.name || 'Genel')))
    return ['all', ...uniqueAreas]
  }, [tables])

  // Filtered tables
  const filteredTables = useMemo(() => {
    if (activeArea === 'all') return tables
    return tables.filter(t => (t.area?.name || 'Genel') === activeArea)
  }, [tables, activeArea])

  return (
    <div className="space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-3">
        <label className="text-[10px] font-black text-text-primary uppercase tracking-widest ml-0.5 block">
          MASA SEÇİMİ {busyTableIds.length > 0 && <span className="text-danger-main ml-2">({busyTableIds.length} MASA DOLU)</span>}
        </label>

        <div className="flex flex-wrap gap-1 p-1 bg-bg-muted/50 rounded-sm border border-border-light">
          {areas.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setActiveArea(area)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-sm transition-all",
                activeArea === area
                  ? "bg-bg-surface text-primary-main shadow-sm border border-border-light"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {area === 'all' ? 'TÜMÜ' : area}
            </button>
          ))}
        </div>
      </div>

      {/* Table Grid - Fixed height for ~2 rows with internal scrolling */}
      <div className="h-[190px] overflow-y-auto bg-bg-muted/5 rounded-sm border border-border-light p-3 scrollbar-style">
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-50">
            <LayoutGrid className="w-10 h-10 mb-2" />
            <p className="text-xs font-medium">Bu alanda masa bulunamadı</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
            {filteredTables.map((table) => {
              const isSelected = selectedTableId === table.id
              const isBusy = busyTableIds.includes(table.id)
              const isDisabled = disabled || (table.status === TableStatus.OUT_OF_SERVICE)

              return (
                <button
                  key={table.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelect(table.id)}
                  className={cn(
                    "relative p-3 rounded-sm border-2 transition-all text-left flex flex-col gap-1 group",
                    isSelected
                      ? "border-primary-main bg-primary-main/5 shadow-md shadow-primary-main/5"
                      : isBusy
                        ? "border-danger-main/30 bg-danger-main/5 opacity-80 cursor-not-allowed"
                        : "border-border-light bg-bg-surface hover:border-primary-main/50 hover:shadow-sm cursor-pointer",
                    isDisabled && "opacity-30 cursor-not-allowed grayscale"
                  )}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary-main flex items-center justify-center shadow-md animate-in zoom-in duration-200">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}

                  {/* Busy Indicator */}
                  {isBusy && !isSelected && (
                    <div className="absolute top-1.5 right-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-danger-main animate-pulse" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-h-[36px]">
                    <div className={cn(
                      "font-black text-[11px] uppercase tracking-tight truncate",
                      isBusy ? "text-danger-main" : isSelected ? "text-primary-main" : "text-text-primary"
                    )}>
                      {table.name}
                    </div>
                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-tighter opacity-70 truncate">
                      {table.area?.name || 'Genel'}
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-bg-muted rounded-[2px]">
                      <Users className="h-3 w-3 text-text-secondary" />
                      <span className="text-[9px] font-black text-text-secondary">{table.capacity}</span>
                    </div>
                  </div>

                  {/* Visual Conflict Ring (Pulse) */}
                  {isBusy && (
                    <div className="absolute inset-0 border border-danger-main/20 animate-pulse pointer-events-none rounded-sm" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      {error ? (
        <div className="flex items-center gap-2 p-3 bg-danger-main/10 border border-danger-main/20 rounded-sm">
          <AlertCircle className="h-4 w-4 text-danger-main" />
          <p className="text-xs font-bold text-danger-main uppercase tracking-tight">{error}</p>
        </div>
      ) : isBusyTableSelected(selectedTableId, busyTableIds) ? (
        <div className="flex items-center gap-2 p-3 bg-danger-main/10 border border-danger-main/20 rounded-sm animate-pulse">
          <AlertCircle className="h-4 w-4 text-danger-main" />
          <p className="text-xs font-bold text-danger-main uppercase tracking-tight">
            SEÇİLEN MASA BU SAATTE DOLU! LÜTFEN FARKLI BİR MASA VEYA SAAT SEÇİN.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function isBusyTableSelected(selectedId?: string, busyIds?: string[]) {
  if (!selectedId || !busyIds) return false
  return busyIds.includes(selectedId)
}
