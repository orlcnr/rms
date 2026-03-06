import { BaseEntity } from '@/modules/shared/types'

export interface Restaurant extends BaseEntity {
    name: string
    slug: string
    description?: string
    address: string
    contact_email?: string
    contact_phone?: string
    opening_hours?: Record<string, any>
    owner_id: string
    brand_id?: string
    is_branch?: boolean
    is_active?: boolean
}

export interface CreateRestaurantInput {
    name: string
    slug: string
    description?: string
    address: string
    contact_email?: string
    contact_phone?: string
    opening_hours?: Record<string, any>
}

export interface UpdateRestaurantInput extends Partial<CreateRestaurantInput> { }
