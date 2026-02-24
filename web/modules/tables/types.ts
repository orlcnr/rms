import { BaseEntity } from '@/modules/shared/types'

export enum TableStatus {
    AVAILABLE = 'available',
    OCCUPIED = 'occupied',
    RESERVED = 'reserved',
    OUT_OF_SERVICE = 'out_of_service',
}

// Active order data for occupied tables
export interface ActiveOrder {
    id: string
    order_number: string
    total_price: number
    created_at: string // ISO format
}

export interface Area extends BaseEntity {
    name: string
    restaurant_id: string
    tables?: Table[]
}

export interface Table extends BaseEntity {
    name: string
    capacity: number
    status: TableStatus
    qr_code_url?: string
    restaurant_id: string
    area_id?: string
    area?: Area
    // Active order data for operation mode
    active_order?: ActiveOrder
}

export interface CreateAreaInput {
    name: string
    restaurant_id: string
}

export interface CreateTableInput {
    name: string
    capacity: number
    status?: TableStatus
    restaurant_id: string
    area_id?: string
}

export interface TableQrData {
    tableId: string
    tableName: string
    restaurantId: string
    restaurantName?: string
    qrToken: string
    qrUrl: string
    qrImageDataUrl: string
}

// ============================================
// DRY: Form Constants
// ============================================

export const TABLE_FORM_DEFAULTS = {
    capacity: 4,
    status: TableStatus.AVAILABLE,
} as const;

export const AREA_FORM_DEFAULTS = {
    name: '',
} as const;

// ============================================
// DRY: Select Options
// ============================================

export const CAPACITY_OPTIONS = Array.from({ length: 20 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `${i + 1} Kişi`,
}));

export const AREA_TABS_ALL = '__all__';
