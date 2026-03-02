'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/modules/shared/components/Button'
import { FormInput } from '@/modules/shared/components/FormInput'
import { RestaurantDetails, RestaurantFormInput } from '../../types'

interface GeneralTabProps {
  restaurant: RestaurantDetails | null
  isLoading: boolean
  onSave: (payload: RestaurantFormInput) => Promise<void>
}

export function GeneralTab({ restaurant, isLoading, onSave }: GeneralTabProps) {
  const [form, setForm] = useState<RestaurantFormInput>({
    name: '',
    slug: '',
    description: '',
    address: '',
    contact_email: '',
    contact_phone: '',
  })

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

      <div className="md:col-span-2 border-t border-border-light pt-4 flex justify-end">
        <Button type="submit" isLoading={isLoading}>FİRMA BİLGİLERİNİ KAYDET</Button>
      </div>
    </form>
  )
}
