'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/modules/shared/components/Button'
import { useUsersStore } from '../../stores/users.store'
import { CreateUserInput, UpdateUserInput, User, UserRole } from '../../types'
import { UserForm } from '../users/UserForm'
import { UserTable } from '../users/UserTable'
import { UserBranchAssignModal } from '../users/UserBranchAssignModal'
import { restaurantService } from '@/modules/restaurants/services/restaurant.service'
import { Restaurant } from '@/modules/restaurants/types'

interface UsersTabProps {
  currentUserRole: UserRole
  currentBranchId?: string
}

export function UsersTab({ currentUserRole, currentBranchId }: UsersTabProps) {
  const {
    users,
    isLoading,
    loadUsers,
    createUser,
    createUserForBranch,
    assignUserToBranch,
    updateUser,
    toggleStatus,
  } = useUsersStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [assigningUser, setAssigningUser] = useState<User | null>(null)
  const [branches, setBranches] = useState<Restaurant[]>([])
  const [isBranchLoading, setIsBranchLoading] = useState(false)
  const [targetBranchId, setTargetBranchId] = useState('')
  const [searchText, setSearchText] = useState('')
  const [filterBranchId, setFilterBranchId] = useState('')
  const canSelectBranchOnCreate = [
    UserRole.BRAND_OWNER,
    UserRole.RESTAURANT_OWNER,
  ].includes(currentUserRole)
  const isBranchManager = currentUserRole === UserRole.BRANCH_MANAGER

  const canManageUsers = useMemo(() => {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.RESTAURANT_OWNER,
      UserRole.MANAGER,
      UserRole.BRAND_OWNER,
      UserRole.BRANCH_MANAGER,
    ].includes(currentUserRole)
  }, [currentUserRole])

  const canAssignBranch = useMemo(() => {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.BRAND_OWNER,
      UserRole.RESTAURANT_OWNER,
      UserRole.BRANCH_MANAGER,
    ].includes(currentUserRole)
  }, [currentUserRole])

  const canFilterByBranch = useMemo(() => {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.BRAND_OWNER,
      UserRole.RESTAURANT_OWNER,
    ].includes(currentUserRole)
  }, [currentUserRole])

  useEffect(() => {
    if (!canManageUsers) return

    async function loadBranches() {
      setIsBranchLoading(true)
      try {
        const loadedBranches = await restaurantService.getBranches()
        const scopedBranches = isBranchManager
          ? loadedBranches.filter((branch) => branch.id === currentBranchId)
          : loadedBranches
        setBranches(scopedBranches)

        if (canSelectBranchOnCreate) {
          setTargetBranchId('')
        } else if (isBranchManager) {
          setTargetBranchId(currentBranchId || scopedBranches[0]?.id || '')
        }
      } catch {
        setBranches([])
      } finally {
        setIsBranchLoading(false)
      }
    }

    void loadBranches()
  }, [canManageUsers, canSelectBranchOnCreate, isBranchManager, currentBranchId])

  useEffect(() => {
    if (!canManageUsers) return

    const handle = setTimeout(() => {
      void loadUsers({
        search: searchText.trim() || undefined,
        branchId: canFilterByBranch ? (filterBranchId || undefined) : undefined,
      })
    }, 250)

    return () => clearTimeout(handle)
  }, [canManageUsers, canFilterByBranch, filterBranchId, loadUsers, searchText])

  function getBranchLabel(branchId?: string) {
    if (!branchId) return '-'
    return branches.find((branch) => branch.id === branchId)?.name || branchId
  }

  async function handleCreate(payload: CreateUserInput) {
    try {
      if (canSelectBranchOnCreate) {
        if (!targetBranchId) {
          toast.error('Lütfen hedef şubeyi seçin')
          return
        }
        await createUserForBranch(targetBranchId, payload)
      } else if (isBranchManager) {
        const branchId = currentBranchId || targetBranchId
        if (!branchId) {
          toast.error('Şube bulunamadı')
          return
        }
        await createUserForBranch(branchId, payload)
      } else {
        await createUser(payload)
      }
      toast.success('Kullanıcı oluşturuldu')
      await loadUsers({
        search: searchText.trim() || undefined,
        branchId: canFilterByBranch ? (filterBranchId || undefined) : undefined,
      })
      setIsModalOpen(false)
      setEditingUser(null)
    } catch {
      toast.error('Kullanıcı oluşturulamadı')
    }
  }

  async function handleUpdate(userId: string, payload: UpdateUserInput) {
    try {
      await updateUser(userId, payload)
      toast.success('Kullanıcı güncellendi')
      await loadUsers({
        search: searchText.trim() || undefined,
        branchId: canFilterByBranch ? (filterBranchId || undefined) : undefined,
      })
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
      await loadUsers({
        search: searchText.trim() || undefined,
        branchId: canFilterByBranch ? (filterBranchId || undefined) : undefined,
      })
    } catch {
      toast.error('Kullanıcı durumu güncellenemedi')
    }
  }

  async function handleAssignBranch(branchId: string) {
    if (!assigningUser) return
    try {
      await assignUserToBranch(assigningUser.id, branchId)
      toast.success('Kullanıcı şubesi güncellendi')
      await loadUsers({
        search: searchText.trim() || undefined,
        branchId: canFilterByBranch ? (filterBranchId || undefined) : undefined,
      })
      setAssigningUser(null)
    } catch {
      toast.error('Kullanıcı şubesi güncellenemedi')
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
            if (canSelectBranchOnCreate) {
              setTargetBranchId('')
            }
            setIsModalOpen(true)
          }}
        >
          YENİ KULLANICI
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="İsim veya e-posta ara..."
          className="w-full bg-bg-app border border-border-light px-4 py-3 text-sm font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-1 rounded-sm placeholder:text-text-muted/40"
        />

        {canFilterByBranch ? (
          <select
            value={filterBranchId}
            onChange={(event) => setFilterBranchId(event.target.value)}
            className="w-full bg-bg-app border border-border-light px-4 py-3 text-sm font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-1 rounded-sm"
          >
            <option value="">Tüm Şubeler</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="w-full bg-bg-app border border-border-light px-4 py-3 text-sm font-semibold text-text-secondary rounded-sm">
            {getBranchLabel(currentBranchId)}
          </div>
        )}
      </div>

      <UserTable
        users={users}
        isLoading={isLoading}
        getBranchLabel={getBranchLabel}
        onEdit={(user) => {
          setEditingUser(user)
          setIsModalOpen(true)
        }}
        onAssignBranch={canAssignBranch ? (user) => setAssigningUser(user) : undefined}
        onToggleActive={handleToggleStatus}
      />

      <UserForm
        isOpen={isModalOpen}
        isSubmitting={isLoading}
        mode={editingUser ? 'edit' : 'create'}
        currentUserRole={currentUserRole}
        userToEdit={editingUser}
        showBranchSelect={!editingUser && canSelectBranchOnCreate}
        branchOptions={branches}
        targetBranchId={targetBranchId}
        onBranchChange={setTargetBranchId}
        onClose={() => {
          setIsModalOpen(false)
          setEditingUser(null)
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <UserBranchAssignModal
        isOpen={Boolean(assigningUser)}
        isSubmitting={isLoading}
        user={assigningUser}
        branches={branches}
        defaultBranchId={
          isBranchManager ? currentBranchId : (assigningUser?.restaurant_id || targetBranchId)
        }
        onClose={() => setAssigningUser(null)}
        onSubmit={handleAssignBranch}
      />

      {canSelectBranchOnCreate && !isBranchLoading && branches.length === 0 && (
        <p className="text-xs font-semibold text-danger-main">
          Önce şube oluşturun, sonra kullanıcı ekleyin.
        </p>
      )}
    </div>
  )
}
