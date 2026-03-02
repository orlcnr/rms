import { http } from '@/modules/shared/api/http'
import {
  GetNotificationsParams,
  Notification,
  NotificationsResponse,
} from './types'

export const notificationsService = {
  async getNotifications(
    params: GetNotificationsParams = {},
  ): Promise<NotificationsResponse> {
    return http.get<NotificationsResponse>('/notifications', { params })
  },

  async getUnreadCount(): Promise<number> {
    const response = await http.get<{ count: number }>('/notifications/unread-count')
    return Number(response.count || 0)
  },

  async markAsRead(id: string): Promise<Notification> {
    return http.patch<Notification>(`/notifications/${id}/read`)
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    return http.patch<{ success: boolean }>('/notifications/read-all')
  },
}

