import { BaseEntity } from '@/modules/shared/types'

export interface Category extends BaseEntity {
    name: string
    description?: string
    restaurant_id: string
    items?: MenuItem[]
}

export interface MenuItem extends BaseEntity {
    name: string
    description?: string
    price: number
    image_url?: string
    is_available: boolean
    track_inventory: boolean
    category_id: string
    category?: Category
}

export interface CreateCategoryInput {
    name: string
    description?: string
    restaurant_id: string
}

export interface CreateMenuItemInput {
    name: string
    description?: string
    price: number
    image_url?: string
    is_available?: boolean
    track_inventory?: boolean
    category_id: string
}

export interface PaginatedResponse<T> {
    items: T[]
    meta: {
        totalItems: number
        itemCount: number
        itemsPerPage: number
        totalPages: number
        currentPage: number
    }
}
