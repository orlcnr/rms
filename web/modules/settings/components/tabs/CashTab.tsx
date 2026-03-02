'use client'

import React from 'react'
import { Button } from '@/modules/shared/components/Button'
import { FormInput } from '@/modules/shared/components/FormInput'
import { RmsSwitch } from '@/modules/shared/components/RmsSwitch'
import { SettingKey } from '../../types'

interface CashTabProps {
  values: {
    defaultOpeningBalance: number
    shiftDurationHours: number
    requireClosingCount: boolean
  }
  isSaving: boolean
  onChange: (key: SettingKey, value: string | number | boolean) => void
  onSave: () => Promise<void>
}

export function CashTab({ values, isSaving, onChange, onSave }: CashTabProps) {
  function parseNumberInput(raw: string, fallback: number): number {
    const normalized = raw.replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          id="default_opening_balance"
          name="default_opening_balance"
          type="number"
          label="Varsayılan Açılış Bakiyesi"
          value={values.defaultOpeningBalance}
          inputMode="decimal"
          onChange={(value) =>
            onChange(
              SettingKey.DEFAULT_OPENING_BALANCE,
              parseNumberInput(value, values.defaultOpeningBalance),
            )
          }
        />

        <FormInput
          id="shift_duration_hours"
          name="shift_duration_hours"
          type="number"
          label="Vardiya Süresi (Saat)"
          value={values.shiftDurationHours}
          inputMode="numeric"
          onChange={(value) =>
            onChange(
              SettingKey.SHIFT_DURATION_HOURS,
              parseNumberInput(value, values.shiftDurationHours),
            )
          }
        />

        <div className="md:col-span-2">
          <RmsSwitch
            checked={values.requireClosingCount}
            onChange={(checked) => onChange(SettingKey.REQUIRE_CLOSING_COUNT, checked)}
            label="Kapanış Sayımı Zorunlu"
            labelOn="ZORUNLU"
            labelOff="OPSİYONEL"
            theme="warning"
          />
        </div>
      </div>

      <div className="border-t border-border-light pt-4 flex justify-end">
        <Button isLoading={isSaving} onClick={onSave}>KASA AYARLARINI KAYDET</Button>
      </div>
    </div>
  )
}
