'use client'

import React from 'react'
import { Button } from '@/modules/shared/components/Button'
import { FormInput } from '@/modules/shared/components/FormInput'
import { Modal } from '@/modules/shared/components/Modal'
import { CreateRestaurantInput } from '@/modules/restaurants/types'
import { slugify } from './types'

interface CreateBranchModalProps {
  isOpen: boolean
  isSubmitting: boolean
  canCreateBranch: boolean
  branchForm: CreateRestaurantInput
  onClose: () => void
  onFormChange: (next: CreateRestaurantInput) => void
  onSubmit: (payload: CreateRestaurantInput) => Promise<void>
}

export function CreateBranchModal({
  isOpen,
  isSubmitting,
  canCreateBranch,
  branchForm,
  onClose,
  onFormChange,
  onSubmit,
}: CreateBranchModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Yeni Şube Ekle">
      <form
        className="grid grid-cols-1 gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit(branchForm)
        }}
      >
        <FormInput
          id="branch_name"
          name="branch_name"
          label="Şube Adı"
          required
          value={branchForm.name}
          onChange={(value) => onFormChange({ ...branchForm, name: value })}
          disabled={!canCreateBranch}
        />
        <FormInput
          id="branch_slug"
          name="branch_slug"
          label="Slug"
          required
          value={branchForm.slug}
          onChange={(value) =>
            onFormChange({ ...branchForm, slug: slugify(value) })
          }
          disabled={!canCreateBranch}
        />
        <FormInput
          id="branch_address"
          name="branch_address"
          label="Adres"
          required
          className="md:col-span-2"
          value={branchForm.address}
          onChange={(value) => onFormChange({ ...branchForm, address: value })}
          disabled={!canCreateBranch}
        />
        <FormInput
          id="branch_contact_email"
          name="branch_contact_email"
          label="E-posta"
          type="email"
          value={branchForm.contact_email || ''}
          onChange={(value) =>
            onFormChange({ ...branchForm, contact_email: value })
          }
          disabled={!canCreateBranch}
        />
        <FormInput
          id="branch_contact_phone"
          name="branch_contact_phone"
          label="Telefon"
          value={branchForm.contact_phone || ''}
          onChange={(value) =>
            onFormChange({ ...branchForm, contact_phone: value })
          }
          disabled={!canCreateBranch}
        />
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            İPTAL
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={!canCreateBranch}>
            ŞUBEYİ OLUŞTUR
          </Button>
        </div>
      </form>
    </Modal>
  )
}

