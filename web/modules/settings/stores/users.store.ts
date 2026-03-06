'use client'

import { create } from 'zustand'
import { settingsUsersService } from '../services/users.service'
import { CreateUserInput, UpdateUserInput, User } from '../types'

interface UsersStore {
  users: User[]
  isLoading: boolean
  error: string | null
  loadUsers: (filters?: { search?: string; branchId?: string }) => Promise<void>
  createUser: (payload: CreateUserInput) => Promise<void>
  createUserForBranch: (branchId: string, payload: CreateUserInput) => Promise<void>
  assignUserToBranch: (userId: string, branchId: string) => Promise<void>
  updateUser: (userId: string, payload: UpdateUserInput) => Promise<void>
  toggleStatus: (userId: string, isActive: boolean) => Promise<void>
}

export const useUsersStore = create<UsersStore>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  loadUsers: async (filters) => {
    set({ isLoading: true, error: null })

    try {
      const response = await settingsUsersService.getUsers(filters)
      set({ users: response.items || [], isLoading: false })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Kullanıcılar yüklenemedi',
      })
    }
  },

  createUser: async (payload) => {
    set({ isLoading: true, error: null })

    try {
      const created = await settingsUsersService.createUser(payload)
      set((state) => ({ users: [created, ...state.users], isLoading: false }))
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Kullanıcı oluşturulamadı',
      })
      throw error
    }
  },

  createUserForBranch: async (branchId, payload) => {
    set({ isLoading: true, error: null })

    try {
      const created = await settingsUsersService.createUserForBranch(branchId, payload)
      set((state) => ({ users: [created, ...state.users], isLoading: false }))
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Kullanıcı oluşturulamadı',
      })
      throw error
    }
  },

  assignUserToBranch: async (userId, branchId) => {
    set({ isLoading: true, error: null })

    try {
      const updated = await settingsUsersService.assignUserToBranch(userId, branchId)
      set((state) => ({
        users: state.users.map((user) => (user.id === userId ? updated : user)),
        isLoading: false,
      }))
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Kullanıcı şubesi değiştirilemedi',
      })
      throw error
    }
  },

  updateUser: async (userId, payload) => {
    set({ isLoading: true, error: null })

    try {
      const updated = await settingsUsersService.updateUser(userId, payload)
      set((state) => ({
        users: state.users.map((user) => (user.id === userId ? updated : user)),
        isLoading: false,
      }))
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Kullanıcı güncellenemedi',
      })
      throw error
    }
  },

  toggleStatus: async (userId, isActive) => {
    const previous = get().users

    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, is_active: isActive } : user,
      ),
      error: null,
    }))

    try {
      const updated = await settingsUsersService.toggleStatus(userId, {
        is_active: isActive,
      })

      set((state) => ({
        users: state.users.map((user) => (user.id === userId ? updated : user)),
      }))
    } catch (error) {
      set({
        users: previous,
        error: error instanceof Error ? error.message : 'Kullanıcı durumu güncellenemedi',
      })
      throw error
    }
  },
}))
