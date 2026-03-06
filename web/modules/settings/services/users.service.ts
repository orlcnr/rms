import { http } from '@/modules/shared/api/http'
import {
  CreateUserInput,
  ToggleUserStatusInput,
  UpdateUserInput,
  User,
  UsersResponse,
} from '../types'

export const settingsUsersService = {
  async getUsers(params?: { search?: string; branchId?: string }) {
    return http.get<UsersResponse>('/users', { params })
  },

  async createUser(payload: CreateUserInput) {
    return http.post<User>('/users', payload)
  },

  async createUserForBranch(branchId: string, payload: CreateUserInput) {
    return http.post<User>(`/users/branches/${branchId}`, payload)
  },

  async updateUser(userId: string, payload: UpdateUserInput) {
    return http.put<User>(`/users/${userId}`, payload)
  },

  async assignUserToBranch(userId: string, branchId: string) {
    return http.post<User>(`/users/${userId}/assign-restaurant`, {
      restaurant_id: branchId,
    })
  },

  async toggleStatus(userId: string, payload: ToggleUserStatusInput) {
    return http.patch<User>(`/users/${userId}/active`, payload)
  },
}
