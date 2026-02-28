// ============================================
// DENOMINATION TABLE COMPONENT
// Banknote counting table for cash closing
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { DenominationEntry, DEFAULT_DENOMINATIONS } from '../types'

interface DenominationTableProps {
  value: DenominationEntry[]
  onChange: (value: DenominationEntry[]) => void
}

export function DenominationTable({ value, onChange }: DenominationTableProps) {
  const [entries, setEntries] = useState<DenominationEntry[]>(
    value.length > 0 ? value : DEFAULT_DENOMINATIONS
  )

  useEffect(() => {
    onChange(entries)
  }, [entries, onChange])

  const updateCount = (denomination: number, count: number) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.denomination === denomination ? { ...e, count: Math.max(0, count) } : e
      )
    )
  }

  const total = entries.reduce((sum, e) => sum + e.denomination * e.count, 0)

  const formatDenomination = (value: number): string => {
    if (value >= 1) {
      return value.toString()
    }
    return value.toFixed(2)
  }

  return (
    <div className="space-y-3 p-4 bg-bg-muted rounded-sm border border-border-light">
      {/* Header */}
      <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-text-secondary uppercase">
        <span>Banknot</span>
        <span className="text-center">Adet</span>
        <span className="text-right">Toplam</span>
      </div>

      {/* Rows */}
      {entries.map((entry) => (
        <div key={entry.denomination} className="grid grid-cols-3 gap-2 items-center">
          <span className="text-sm font-medium">
            ₺{formatDenomination(entry.denomination)}
          </span>
          <input
            type="number"
            min="0"
            value={entry.count || ''}
            onChange={(e) =>
              updateCount(entry.denomination, parseInt(e.target.value) || 0)
            }
            className="px-2 py-1 text-center bg-bg-surface border border-border-light rounded-sm focus:outline-none focus:border-primary-main"
          />
          <span className="text-sm font-bold text-right">
            ₺{(entry.denomination * entry.count).toFixed(2)}
          </span>
        </div>
      ))}

      {/* Total */}
      <div className="pt-3 border-t border-border-light flex justify-between">
        <span className="text-sm font-semibold">Toplam:</span>
        <span className="text-lg font-black text-primary-main">₺{total.toFixed(2)}</span>
      </div>
    </div>
  )
}

export default DenominationTable
