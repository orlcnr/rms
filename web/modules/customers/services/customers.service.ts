import { http } from '@/modules/shared/api/http'
import { PaginatedResponse } from '@/modules/shared/types'
import {
  CreateCustomerDto,
  Customer,
  GetCustomersParams,
  UpdateCustomerDto,
} from '../types'
import { Order } from '@/modules/orders/types'

export const customersApi = {
  getAll: async (params?: GetCustomersParams): Promise<PaginatedResponse<Customer>> => {
    return http.get<PaginatedResponse<Customer>>('/customers', { params })
  },

  getById: async (id: string): Promise<Customer> => {
    return http.get<Customer>(`/customers/${id}`)
  },

  create: async (data: CreateCustomerDto): Promise<Customer> => {
    return http.post<Customer>('/customers', data)
  },

  update: async (id: string, data: UpdateCustomerDto): Promise<Customer> => {
    return http.patch<Customer>(`/customers/${id}`, data)
  },

  remove: async (id: string): Promise<void> => {
    return http.delete<void>(`/customers/${id}`)
  },

  search: async (query: string): Promise<Customer[]> => {
    return http.get<Customer[]>('/customers/search', {
      params: { q: query },
    })
  },

  getOrders: async (id: string): Promise<Order[]> => {
    return http.get<Order[]>(`/customers/${id}/orders`)
  },
}

export const customerService = {
  getCustomers: customersApi.getAll,
  getCustomer: customersApi.getById,
  createCustomer: customersApi.create,
  updateCustomer: customersApi.update,
  deleteCustomer: customersApi.remove,
  searchCustomers: customersApi.search,
  getCustomerOrders: customersApi.getOrders,
}

export type { Customer }
