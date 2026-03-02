'use client'

import React from 'react'
import { RmsSwitch } from '@/modules/shared/components/RmsSwitch'
import { Button } from '@/modules/shared/components/Button'
import { FormInput } from '@/modules/shared/components/FormInput'
import { SettingKey } from '../../types'
import { PAYMENT_METHOD_LABELS, PaymentMethod } from '@/modules/orders/types'

interface PaymentTabProps {
  values: {
    enabledPaymentMethods: PaymentMethod[]
    tipCommissionEnabled: boolean
    tipCommissionRate: number
    tipCommissionEditable: boolean
  }
  isSaving: boolean
  onChange: (key: SettingKey, value: string | number | boolean) => void
  onPaymentMethodsChange: (methods: PaymentMethod[]) => void
  onSave: () => Promise<void>
}

const AVAILABLE_PAYMENT_METHODS = Object.values(PaymentMethod)

export function PaymentTab({
  values,
  isSaving,
  onChange,
  onPaymentMethodsChange,
  onSave,
}: PaymentTabProps) {
  function parseNumberInput(raw: string, fallback: number): number {
    const normalized = raw.replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const selectedMethods = values.enabledPaymentMethods
  const hasAtLeastOneMethod = selectedMethods.length > 0

  function toggleMethod(method: PaymentMethod) {
    const isSelected = selectedMethods.includes(method)
    if (isSelected) {
      onPaymentMethodsChange(selectedMethods.filter((item) => item !== method))
      return
    }

    onPaymentMethodsChange([...selectedMethods, method])
  }

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-border-light bg-bg-surface p-4">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
          POS&apos;ta Görünecek Ödeme Yöntemleri
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {AVAILABLE_PAYMENT_METHODS.map((method) => {
            const isSelected = selectedMethods.includes(method)
            return (
              <label
                key={method}
                className="flex items-center gap-2 rounded-sm border border-border-light px-3 py-2 cursor-pointer hover:border-primary-main/40 transition-colors"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={isSelected}
                  onChange={() => toggleMethod(method)}
                />
                <span className="text-sm text-text-primary">
                  {PAYMENT_METHOD_LABELS[method]}
                </span>
              </label>
            )
          })}
        </div>
        {!hasAtLeastOneMethod && (
          <p className="mt-2 text-xs text-danger-main">
            En az bir ödeme yöntemi seçilmelidir.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RmsSwitch
          checked={values.tipCommissionEnabled}
          onChange={(checked) => onChange(SettingKey.TIP_COMMISSION_ENABLED, checked)}
          label="Bahşiş Komisyonu"
          labelOn="AKTİF"
          labelOff="PASİF"
          theme="primary"
        />

        <RmsSwitch
          checked={values.tipCommissionEditable}
          onChange={(checked) => onChange(SettingKey.TIP_COMMISSION_EDITABLE, checked)}
          label="Komisyon Düzenlenebilir"
          labelOn="AKTİF"
          labelOff="PASİF"
          theme="info"
        />

        <FormInput
          id="tip_commission_rate"
          name="tip_commission_rate"
          type="number"
          label="Bahşiş Komisyon Oranı"
          value={values.tipCommissionRate}
          onChange={(value) =>
            onChange(
              SettingKey.TIP_COMMISSION_RATE,
              parseNumberInput(value, values.tipCommissionRate),
            )
          }
          className="md:col-span-2"
          inputMode="decimal"
        />
      </div>

      <div className="border-t border-border-light pt-4 flex justify-end">
        <Button
          isLoading={isSaving}
          onClick={onSave}
          disabled={!hasAtLeastOneMethod}
        >
          ÖDEME AYARLARINI KAYDET
        </Button>
      </div>
    </div>
  )
}
