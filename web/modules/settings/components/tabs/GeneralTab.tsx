'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/modules/shared/components/Button'
import { FormInput } from '@/modules/shared/components/FormInput'
import { RmsSwitch } from '@/modules/shared/components/RmsSwitch'
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
} from '@/modules/shared/utils/notification-sound'
import {
  PrinterProfilesSettingV1,
  RestaurantDetails,
  RestaurantFormInput,
} from '../../types'
import { PrinterProfilesSection } from './PrinterProfilesSection'

interface GeneralTabProps {
  restaurantId: string
  restaurant: RestaurantDetails | null
  isLoading: boolean
  reservationSlotMinutes: number
  printerProfiles: PrinterProfilesSettingV1
  onReservationSlotMinutesChange: (value: number) => void
  onPrinterProfilesChange: (value: PrinterProfilesSettingV1) => void
  onSave: (payload: RestaurantFormInput) => Promise<void>
}

export function GeneralTab({
  restaurantId,
  restaurant,
  isLoading,
  reservationSlotMinutes,
  printerProfiles,
  onReservationSlotMinutesChange,
  onPrinterProfilesChange,
  onSave,
}: GeneralTabProps) {
  const [form, setForm] = useState<RestaurantFormInput>({
    name: '',
    slug: '',
    description: '',
    address: '',
    contact_email: '',
    contact_phone: '',
  })
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    setSoundEnabled(isNotificationSoundEnabled())
  }, [])

  useEffect(() => {
    if (!restaurant) return

    setForm({
      name: restaurant.name || '',
      slug: restaurant.slug || '',
      description: restaurant.description || '',
      address: restaurant.address || '',
      contact_email: restaurant.contact_email || '',
      contact_phone: restaurant.contact_phone || '',
    })
  }, [restaurant])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await onSave(form)
  }

  return (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
      <FormInput
        id="restaurant_name"
        name="restaurant_name"
        label="Firma Adı"
        required
        value={form.name || ''}
        onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
      />

      <FormInput
        id="restaurant_slug"
        name="restaurant_slug"
        label="Slug"
        required
        value={form.slug || ''}
        onChange={(value) => setForm((prev) => ({ ...prev, slug: value }))}
      />

      <FormInput
        id="contact_email"
        name="contact_email"
        label="İletişim E-posta"
        type="email"
        value={form.contact_email || ''}
        onChange={(value) => setForm((prev) => ({ ...prev, contact_email: value }))}
      />

      <FormInput
        id="contact_phone"
        name="contact_phone"
        label="İletişim Telefon"
        type="tel"
        value={form.contact_phone || ''}
        onChange={(value) => setForm((prev) => ({ ...prev, contact_phone: value }))}
      />

      <FormInput
        id="address"
        name="address"
        label="Adres"
        required
        className="md:col-span-2"
        value={form.address || ''}
        onChange={(value) => setForm((prev) => ({ ...prev, address: value }))}
      />

      <FormInput
        id="description"
        name="description"
        label="Açıklama"
        isTextarea
        rows={4}
        className="md:col-span-2"
        value={form.description || ''}
        onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
      />

      <div className="md:col-span-2 rounded-sm border border-border-light bg-bg-surface p-4">
        <div className="mb-4">
          <FormInput
            id="reservation_slot_minutes"
            name="reservation_slot_minutes"
            label="Rezervasyon Slot Süresi (Dakika)"
            type="number"
            value={String(reservationSlotMinutes)}
            onChange={(value) =>
              onReservationSlotMinutesChange(Number(value) || 120)
            }
          />
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-text-primary">
              Sesli Bildirim
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Yeni sipariş, misafir siparişi, garson çağrısı ve hesap isteği
              bildirimlerinde zil sesi çalınsın.
            </p>
          </div>

          <RmsSwitch
            checked={soundEnabled}
            onChange={(checked) => {
              setSoundEnabled(checked)
              setNotificationSoundEnabled(checked)
            }}
            label="Sesli bildirim"
            labelOn="AÇIK"
            labelOff="KAPALI"
            theme="primary"
            containerClassName="bg-bg-app"
          />
        </div>
      </div>

      <div className="md:col-span-2">
        <PrinterProfilesSection
          restaurantId={restaurantId}
          value={printerProfiles}
          onChange={onPrinterProfilesChange}
        />
      </div>

      <div className="md:col-span-2 border-t border-border-light pt-4 flex justify-end">
        <Button type="submit" isLoading={isLoading}>FİRMA BİLGİLERİNİ KAYDET</Button>
      </div>
    </form>
  )
}
