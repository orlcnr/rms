'use client'

import React from 'react'
import { Button } from '@/modules/shared/components/Button'
import { RmsSwitch } from '@/modules/shared/components/RmsSwitch'
import { User } from '../../types'
import { UserStatusBadge } from './UserStatusBadge'

interface UserTableProps {
  users: User[]
  isLoading: boolean
  onEdit: (user: User) => void
  onToggleActive: (user: User, nextActive: boolean) => void
}

export function UserTable({ users, isLoading, onEdit, onToggleActive }: UserTableProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-text-muted text-xs font-bold uppercase tracking-widest">
        Kullanıcılar yükleniyor...
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted text-xs font-bold uppercase tracking-widest">
        Kayıtlı kullanıcı bulunamadı
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px]">
        <thead>
          <tr className="border-b border-border-light bg-bg-app/50">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">Ad Soyad</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">E-posta</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">Telefon</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">Rol</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">Durum</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">Aksiyon</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border-light last:border-b-0 hover:bg-bg-app/40">
              <td className="px-4 py-3 text-sm font-semibold text-text-primary">{user.first_name} {user.last_name}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">{user.email}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">{user.phone || '-'}</td>
              <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-primary">{user.role}</td>
              <td className="px-4 py-3"><UserStatusBadge isActive={user.is_active} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="!px-3 !py-1.5"
                    onClick={() => onEdit(user)}
                  >
                    Düzenle
                  </Button>

                  <RmsSwitch
                    checked={user.is_active}
                    onChange={(checked) => onToggleActive(user, checked)}
                    label={user.is_active ? 'AKTIF' : 'PASIF'}
                    theme={user.is_active ? 'success' : 'danger'}
                    size="sm"
                    containerClassName="!px-2 !py-1"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
