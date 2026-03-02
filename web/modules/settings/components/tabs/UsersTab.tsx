'use client'

import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/modules/shared/components/Button'
import { useUsersStore } from '../../stores/users.store'
import { CreateUserInput, UpdateUserInput, User, UserRole } from '../../types'
import { UserForm } from '../users/UserForm'
import { UserTable } from '../users/UserTable'

interface UsersTabProps {
  currentUserRole: UserRole
}

export function UsersTab({ currentUserRole }: UsersTabProps) {
  const { users, isLoading, createUser, updateUser, toggleStatus } = useUsersStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const canManageUsers = useMemo(() => {
    return [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER].includes(
      currentUserRole,
    )
  }, [currentUserRole])

  async function handleCreate(payload: CreateUserInput) {
    try {
      await createUser(payload)
      toast.success('Kullanıcı oluşturuldu')
      setIsModalOpen(false)
    } catch {
      toast.error('Kullanıcı oluşturulamadı')
    }
  }

  async function handleUpdate(userId: string, payload: UpdateUserInput) {
    try {
      await updateUser(userId, payload)
      toast.success('Kullanıcı güncellendi')
      setIsModalOpen(false)
      setEditingUser(null)
    } catch {
      toast.error('Kullanıcı güncellenemedi')
    }
  }

  async function handleToggleStatus(user: User, nextActive: boolean) {
    try {
      await toggleStatus(user.id, nextActive)
      toast.success('Kullanıcı durumu güncellendi')
    } catch {
      toast.error('Kullanıcı durumu güncellenemedi')
    }
  }

  if (!canManageUsers) {
    return (
      <div className="p-8 text-center text-text-muted text-xs font-bold uppercase tracking-widest">
        Kullanıcı yönetimi için yetkiniz bulunmuyor
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">Kullanıcı Listesi</h3>
          <p className="text-xs text-text-muted font-semibold">Rol ve aktiflik durumlarını buradan yönetebilirsiniz.</p>
        </div>

        <Button
          onClick={() => {
            setEditingUser(null)
            setIsModalOpen(true)
          }}
        >
          YENİ KULLANICI
        </Button>
      </div>

      <UserTable
        users={users}
        isLoading={isLoading}
        onEdit={(user) => {
          setEditingUser(user)
          setIsModalOpen(true)
        }}
        onToggleActive={handleToggleStatus}
      />

      <UserForm
        isOpen={isModalOpen}
        isSubmitting={isLoading}
        mode={editingUser ? 'edit' : 'create'}
        currentUserRole={currentUserRole}
        userToEdit={editingUser}
        onClose={() => {
          setIsModalOpen(false)
          setEditingUser(null)
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
