import { http } from '@/modules/shared/api/http';

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  total_debt: number;
  current_debt: number;
  credit_limit: number;
  credit_limit_enabled: boolean;
}

export interface CreateCustomerDto {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  notes?: string;
  restaurant_id: string; // Required for multi-tenant support
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const customersApi = {
  getAll: async (params?: { search?: string; limit?: number; page?: number }): Promise<PaginatedResponse<Customer>> => {
    return http.get<PaginatedResponse<Customer>>('/customers', { params });
  },

  getById: async (id: string) => {
    return http.get<Customer>(`/customers/${id}`);
  },

  create: async (data: CreateCustomerDto) => {
    return http.post<Customer>('/customers', data);
  },

  search: async (query: string, restaurantId?: string) => {
    return http.get<Customer[]>('/customers/search', { 
      params: { q: query, ...(restaurantId && { restaurantId }) } 
    });
  },
};
