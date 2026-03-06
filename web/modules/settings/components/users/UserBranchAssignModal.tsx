'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Modal } from '@/modules/shared/components/Modal'
import { FormInput } from '@/modules/shared/components/FormInput'
import { Button } from '@/modules/shared/components/Button'
import { Restaurant } from '@/modules/restaurants/types'
import { User } from '../../types'

interface UserBranchAssignModalProps {
  isOpen: boolean
  isSubmitting: boolean
  user: User | null
  branches: Restaurant[]
  defaultBranchId?: string
  onClose: () => void
  onSubmit: (branchId: string) => Promise<void>
}

export function UserBranchAssignModal({
  isOpen,
  isSubmitting,
  user,
  branches,
  defaultBranchId,
  onClose,
  onSubmit,
}: UserBranchAssignModalProps) {
  const [branchId, setBranchId] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setBranchId(defaultBranchId || user?.restaurant_id || branches[0]?.id || '')
  }, [isOpen, defaultBranchId, user, branches])

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
      })),
    [branches],
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!branchId) return
    await onSubmit(branchId)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ŞUBE DEĞİŞTİR"
      maxWidth="max-w-lg"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-xs text-text-muted font-semibold">
          Bu işlem kullanıcının aktif şubesini değiştirir ve eski tokenlarını geçersiz kılar.
        </p>

        <div className="rounded-md border border-border-light p-3 bg-bg-app/40">
          <div className="text-xs font-black uppercase tracking-wider text-text-muted">Kullanıcı</div>
          <div className="text-sm font-semibold text-text-primary">
            {user ? `${user.first_name} ${user.last_name}` : '-'}
          </div>
          <div className="text-xs text-text-secondary">{user?.email}</div>
        </div>

        <FormInput
          id="assign_branch_id"
          name="assign_branch_id"
          label="Hedef Şube"
          required
          isSelect
          value={branchId}
          options={branchOptions}
          onChange={(value) => setBranchId(value)}
        />

        <div className="flex justify-end gap-3 pt-2 border-t border-border-light">
          <Button type="button" variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={!branchId}>
            ŞUBEYİ GÜNCELLE
          </Button>
        </div>
      </form>
    </Modal>
  )
}
