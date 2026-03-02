import { http } from '@/modules/shared/api/http'
import { Customer, CreateCustomerDto, UpdateCustomerDto, GetCustomersParams } from './types'
import { PaginatedResponse } from '@/modules/shared/types'
import { Order } from '../orders/types'

export const customerService = {
    getCustomers: async (params?: GetCustomersParams): Promise<PaginatedResponse<Customer>> => {
        return http.get('/customers', { params })
    },

    getCustomer: async (id: string): Promise<Customer> => {
        return http.get(`/customers/${id}`)
    },

    createCustomer: async (data: CreateCustomerDto): Promise<Customer> => {
        return http.post('/customers', data)
    },

    updateCustomer: async (id: string, data: UpdateCustomerDto): Promise<Customer> => {
        return http.patch(`/customers/${id}`, data)
    },

    deleteCustomer: async (id: string): Promise<void> => {
        return http.delete(`/customers/${id}`)
    },

    searchCustomers: async (q: string): Promise<Customer[]> => {
        return http.get('/customers/search', { params: { q } })
    },

    getCustomerOrders: async (id: string): Promise<Order[]> => {
        return http.get(`/customers/${id}/orders`)
    }
}
