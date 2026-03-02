'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/modules/shared/components/Modal'
import { Button } from '@/modules/shared/components/Button'
import { FormInput } from '@/modules/shared/components/FormInput'
import { CreateUserInput, UpdateUserInput, User, UserRole } from '../../types'

interface UserFormProps {
  isOpen: boolean
  isSubmitting: boolean
  mode: 'create' | 'edit'
  currentUserRole: UserRole
  userToEdit?: User | null
  onClose: () => void
  onCreate: (payload: CreateUserInput) => Promise<void>
  onUpdate: (userId: string, payload: UpdateUserInput) => Promise<void>
}

interface UserFormState {
  first_name: string
  last_name: string
  email: string
  phone: string
  role: UserRole
  password: string
}

const INITIAL_FORM: UserFormState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: UserRole.WAITER,
  password: '',
}

function getAllowedRoles(currentUserRole: UserRole): UserRole[] {
  if (currentUserRole === UserRole.SUPER_ADMIN) {
    return [
      UserRole.RESTAURANT_OWNER,
      UserRole.MANAGER,
      UserRole.WAITER,
      UserRole.CHEF,
      UserRole.CUSTOMER,
    ]
  }

  if (currentUserRole === UserRole.RESTAURANT_OWNER) {
    return [UserRole.MANAGER, UserRole.WAITER, UserRole.CHEF, UserRole.CUSTOMER]
  }

  if (currentUserRole === UserRole.MANAGER) {
    return [UserRole.WAITER, UserRole.CHEF, UserRole.CUSTOMER]
  }

  return []
}

export function UserForm({
  isOpen,
  isSubmitting,
  mode,
  currentUserRole,
  userToEdit,
  onClose,
  onCreate,
  onUpdate,
}: UserFormProps) {
  const [form, setForm] = useState<UserFormState>(INITIAL_FORM)

  useEffect(() => {
    if (!isOpen) return

    if (mode === 'edit' && userToEdit) {
      setForm({
        first_name: userToEdit.first_name,
        last_name: userToEdit.last_name,
        email: userToEdit.email,
        phone: userToEdit.phone || '',
        role: userToEdit.role,
        password: '',
      })
      return
    }

    setForm(INITIAL_FORM)
  }, [isOpen, mode, userToEdit])

  const allowedRoles = useMemo(() => getAllowedRoles(currentUserRole), [currentUserRole])

  const roleOptions = allowedRoles.map((role) => ({
    value: role,
    label: role.toUpperCase(),
  }))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (mode === 'create') {
      await onCreate({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        password: form.password,
      })
      return
    }

    if (!userToEdit) return

    await onUpdate(userToEdit.id, {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      role: form.role,
      ...(form.password.trim() ? { password: form.password.trim() } : {}),
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'KULLANICI EKLE' : 'KULLANICI DÜZENLE'}
      maxWidth="max-w-2xl"
    >
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
        <FormInput
          id="first_name"
          name="first_name"
          label="Ad"
          value={form.first_name}
          required
          onChange={(value) => setForm((prev) => ({ ...prev, first_name: value }))}
        />

        <FormInput
          id="last_name"
          name="last_name"
          label="Soyad"
          value={form.last_name}
          required
          onChange={(value) => setForm((prev) => ({ ...prev, last_name: value }))}
        />

        <FormInput
          id="email"
          name="email"
          type="email"
          label="E-posta"
          value={form.email}
          required
          onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
        />

        <FormInput
          id="phone"
          name="phone"
          type="tel"
          label="Telefon"
          value={form.phone}
          onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
        />

        <FormInput
          id="role"
          name="role"
          label="Rol"
          required
          isSelect
          options={roleOptions}
          value={form.role}
          onChange={(value) => setForm((prev) => ({ ...prev, role: value as UserRole }))}
        />

        <div className="space-y-2">
          <FormInput
            id="password"
            name="password"
            type="password"
            label={mode === 'create' ? 'Şifre' : 'Yeni Şifre'}
            value={form.password}
            required={mode === 'create'}
            onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
          />
          {mode === 'edit' && (
            <p className="text-xs text-text-muted font-semibold">
              Boş bırakırsanız mevcut şifre korunur.
            </p>
          )}
        </div>

        <div className="md:col-span-2 flex justify-end gap-3 pt-2 border-t border-border-light mt-2">
          <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
          <Button type="submit" isLoading={isSubmitting}>
            {mode === 'create' ? 'KULLANICI OLUŞTUR' : 'DEĞİŞİKLİKLERİ KAYDET'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
