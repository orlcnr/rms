export interface Customer {
    id: string
    first_name: string
    last_name: string
    phone: string
    email?: string
    restaurantId: string
    visit_count: number
    total_spent: number
    current_debt: number
    credit_limit: number
    credit_limit_enabled: boolean
    max_open_orders: number
    last_visit?: string
    notes?: string
    tags?: string[]
    createdAt: string
    updatedAt: string
}

export interface CreateCustomerDto {
    first_name: string
    last_name: string
    phone: string
    email?: string
    notes?: string
    tags?: string[]
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {
    credit_limit?: number
    credit_limit_enabled?: boolean
    max_open_orders?: number
}

export interface GetCustomersParams {
    page?: number
    limit?: number
    search?: string
    hasDebt?: boolean
}

export const CUSTOMER_TABLE_HEADERS = [
    { key: 'name', align: 'left' },
    { key: 'phone', align: 'left' },
    { key: 'visit_count', align: 'center' },
    { key: 'lastVisit', align: 'center' },
    { key: 'total_spent', align: 'right' },
    { key: 'creditLimit', align: 'right' },
    { key: 'current_debt', align: 'right' },
    { key: 'actions', align: 'right' },
] as const
