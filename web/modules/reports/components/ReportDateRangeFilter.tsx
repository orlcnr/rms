'use client'

import { DateTimePicker } from '@/modules/shared/components/DateTimePicker'
import { ReportDateRangeFilters } from '../types'

interface ReportDateRangeFilterProps {
  filters: ReportDateRangeFilters
  onChange: (filters: ReportDateRangeFilters) => void
  onApply: () => void
  onReset: () => void
  isLoading: boolean
}

export function ReportDateRangeFilter({
  filters,
  onChange,
  onApply,
  onReset,
  isLoading,
}: ReportDateRangeFilterProps) {
  const toPickerValue = (value: string) => (value ? `${value}T19:00:00` : '')

  const fromPickerValue = (value: string) => {
    if (!value) {
      return ''
    }

    return new Date(value).toLocaleDateString('sv-SE')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <DateTimePicker
          id="report-start-date"
          label="Başlangıç Tarihi"
          value={toPickerValue(filters.startDate)}
          onChange={(value) =>
            onChange({
              ...filters,
              startDate: fromPickerValue(value),
            })
          }
          showTime={false}
          placeholder="Tarih seçin"
        />

        <DateTimePicker
          id="report-end-date"
          label="Bitiş Tarihi"
          value={toPickerValue(filters.endDate)}
          onChange={(value) =>
            onChange({
              ...filters,
              endDate: fromPickerValue(value),
            })
          }
          showTime={false}
          placeholder="Tarih seçin"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-sm bg-primary-main px-4 py-3 text-[11px] font-black uppercase tracking-wider text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onApply}
          disabled={isLoading}
        >
          {isLoading ? 'Yükleniyor...' : 'Uygula'}
        </button>

        <button
          className="rounded-sm border border-border-light px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-primary transition hover:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onReset}
          disabled={isLoading}
        >
          Tarihi Sıfırla
        </button>
      </div>
    </div>
  )
}
