'use client'

import React from 'react'
import { DateTimePicker } from '@/modules/shared/components/DateTimePicker'
import { AuditLogFilters as AuditLogFiltersValue } from '../types'
import { AuditActionFilterSelect } from './AuditActionFilterSelect'
import { AUDIT_ACTION_OPTIONS } from '../constants/audit-action-options'
import { AUDIT_RESOURCE_OPTIONS } from '../constants/audit-resource-options'

interface AuditLogFiltersProps {
  filters: AuditLogFiltersValue
  onChange: (filters: AuditLogFiltersValue) => void
  onApply: () => void
  onReset: () => void
  isLoading: boolean
}

export function AuditLogFilters({
  filters,
  onChange,
  onApply,
  onReset,
  isLoading,
}: AuditLogFiltersProps) {
  const toPickerValue = (value: string) => (value ? `${value}T19:00:00` : '')

  const fromPickerValue = (value: string) => {
    if (!value) {
      return ''
    }

    return new Date(value).toLocaleDateString('sv-SE')
  }

  const updateField = <K extends keyof AuditLogFiltersValue,>(
    key: K,
    value: AuditLogFiltersValue[K],
  ) => {
    onChange({
      ...filters,
      [key]: value,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <DateTimePicker
          id="audit-start-date"
          label="Başlangıç Tarihi"
          value={toPickerValue(filters.startDate)}
          onChange={(value) => updateField('startDate', fromPickerValue(value))}
          showTime={false}
          placeholder="Tarih seçin"
        />

        <DateTimePicker
          id="audit-end-date"
          label="Bitiş Tarihi"
          value={toPickerValue(filters.endDate)}
          onChange={(value) => updateField('endDate', fromPickerValue(value))}
          showTime={false}
          placeholder="Tarih seçin"
        />

        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">
            Kullanıcı
          </span>
          <input
            className="w-full rounded-sm border border-border-light bg-bg-surface px-4 py-3 text-sm font-bold text-text-primary outline-none transition-colors focus:border-primary-main"
            type="text"
            value={filters.userName}
            onChange={(event) => updateField('userName', event.target.value)}
            placeholder="AD VEYA SOYAD"
          />
        </label>

        <AuditActionFilterSelect
          id="audit-action"
          label="Aksiyon"
          value={filters.action}
          onChange={(value) => updateField('action', value)}
          options={AUDIT_ACTION_OPTIONS}
          placeholder="Tüm aksiyonlar"
        />

        <AuditActionFilterSelect
          id="audit-resource"
          label="Kaynak"
          value={filters.resource}
          onChange={(value) => updateField('resource', value)}
          options={AUDIT_RESOURCE_OPTIONS}
          placeholder="Tüm kaynaklar"
        />

        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">
            Payload Arama
          </span>
          <input
            className="w-full rounded-sm border border-border-light bg-bg-surface px-4 py-3 text-sm font-bold text-text-primary outline-none transition-colors focus:border-primary-main"
            type="text"
            value={filters.payloadText}
            onChange={(event) => updateField('payloadText', event.target.value)}
            placeholder="kategori, fiyat, aciklama..."
          />
        </label>
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
          Filtreleri Sıfırla
        </button>
      </div>
    </div>
  )
}
