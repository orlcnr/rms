export interface BaseEntity {
    id: string
    created_at: string
    updated_at: string
}

export interface ApiResponse<T> {
    success: boolean
    message?: string
    data: T
    meta?: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}
