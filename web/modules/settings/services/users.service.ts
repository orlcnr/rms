import { http } from '@/modules/shared/api/http'
import {
  CreateUserInput,
  ToggleUserStatusInput,
  UpdateUserInput,
  User,
  UsersResponse,
} from '../types'

export const settingsUsersService = {
  async getUsers() {
    return http.get<UsersResponse>('/users')
  },

  async createUser(payload: CreateUserInput) {
    return http.post<User>('/users', payload)
  },

  async updateUser(userId: string, payload: UpdateUserInput) {
    return http.put<User>(`/users/${userId}`, payload)
  },

  async toggleStatus(userId: string, payload: ToggleUserStatusInput) {
    return http.patch<User>(`/users/${userId}/active`, payload)
  },
}
