import axios from 'axios'
import { http } from '@/modules/shared/api/http'
import {
  GuestBootstrapResponse,
  GuestCatalogCategory,
  GuestRequestAck,
  GuestSessionCreateResponse,
  PendingGuestApprovalItem,
} from './types'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://api.localhost/api/v1'

function createGuestHeaders(token?: string) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined
}

export function isGuestSessionInvalidError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false
  }

  return error.response?.status === 401
}

export const guestApi = {
  async createSession(payload: Record<string, unknown>) {
    const response = await axios.post<{
      success: boolean
      data: GuestSessionCreateResponse
    }>(`${API_BASE_URL}/guest/sessions`, payload)

    return response.data.data
  },

  async heartbeat(token: string, sessionId: string) {
    const response = await axios.post<{
      success: boolean
      data: {
        isActive: boolean
        guestAccessToken?: string | null
      }
    }>(
      `${API_BASE_URL}/guest/sessions/${sessionId}/heartbeat`,
      {},
      {
        headers: createGuestHeaders(token),
      },
    )

    return response.data.data
  },

  async getBootstrap(token: string) {
    const response = await axios.get<{
      success: boolean
      data: GuestBootstrapResponse
    }>(`${API_BASE_URL}/guest/bootstrap`, {
      headers: createGuestHeaders(token),
    })

    return response.data.data
  },

  async getCatalog(token: string) {
    const response = await axios.get<{
      success: boolean
      data: {
        serverTime: string
        catalog: GuestCatalogCategory[]
      }
    }>(`${API_BASE_URL}/guest/catalog`, {
      headers: createGuestHeaders(token),
    })

    return response.data.data
  },

  async updateSessionProfile(
    token: string,
    sessionId: string,
    displayName?: string,
  ) {
    const response = await axios.patch<{
      success: boolean
      data: {
        serverTime: string
        session: GuestBootstrapResponse['session']
      }
    }>(
      `${API_BASE_URL}/guest/sessions/${sessionId}/profile`,
      { displayName },
      {
        headers: createGuestHeaders(token),
      },
    )

    return response.data.data
  },

  async createDraftOrder(token: string, payload: Record<string, unknown>) {
    const response = await axios.post(`${API_BASE_URL}/guest/orders`, payload, {
      headers: createGuestHeaders(token),
    })
    return response.data.data
  },

  async updateDraftOrder(
    token: string,
    orderId: string,
    payload: Record<string, unknown>,
  ) {
    const response = await axios.put(
      `${API_BASE_URL}/guest/orders/${orderId}`,
      payload,
      {
        headers: createGuestHeaders(token),
      },
    )
    return response.data.data
  },

  async submitDraftOrder(token: string, orderId: string) {
    const response = await axios.post(
      `${API_BASE_URL}/guest/orders/${orderId}/submit`,
      {},
      {
        headers: createGuestHeaders(token),
      },
    )
    return response.data.data
  },

  async callWaiter(token: string, payload: Record<string, unknown> = {}) {
    const response = await axios.post<{
      success: boolean
      data: GuestRequestAck<unknown>
    }>(`${API_BASE_URL}/guest/requests/waiter`, payload, {
      headers: createGuestHeaders(token),
    })
    return response.data.data
  },

  async requestBill(token: string, payload: Record<string, unknown> = {}) {
    const response = await axios.post<{
      success: boolean
      data: GuestRequestAck<unknown>
    }>(`${API_BASE_URL}/guest/requests/bill`, payload, {
      headers: createGuestHeaders(token),
    })
    return response.data.data
  },
}

export const guestStaffApi = {
  async getPendingApprovals(restaurantId: string) {
    return http.get<PendingGuestApprovalItem[]>(
      `/orders/guest-approvals/restaurant/${restaurantId}/pending`,
    )
  },

  async approveOrder(id: string, notes?: string) {
    return http.post(
      `/orders/guest-approvals/${id}/approve`,
      { notes },
      { skipToast: true } as any,
    )
  },

  async rejectOrder(id: string, reason: string) {
    return http.post<PendingGuestApprovalItem>(
      `/orders/guest-approvals/${id}/reject`,
      { reason },
      { skipToast: true } as any,
    )
  },
}
