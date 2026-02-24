import { http } from '@/modules/shared/api/http'
import { getCookie } from 'cookies-next'
import { Area, Table, CreateAreaInput, CreateTableInput, TableQrData } from '../types'

export const tablesApi = {
    // Areas
    getAreas: async (restaurantId: string) => {
        return http.get<Area[]>(`/tables/restaurants/${restaurantId}/areas`)
    },

    createArea: async (data: CreateAreaInput) => {
        return http.post<Area>('/tables/areas', data)
    },

    updateArea: async (id: string, data: Partial<CreateAreaInput>) => {
        return http.patch<Area>(`/tables/areas/${id}`, data)
    },

    deleteArea: async (id: string) => {
        return http.delete<void>(`/tables/areas/${id}`)
    },

    // Tables
    getTables: async (restaurantId: string) => {
        return http.get<Table[]>(`/tables/restaurants/${restaurantId}`)
    },

    getTable: async (id: string) => {
        return http.get<Table>(`/tables/${id}`)
    },

    createTable: async (data: CreateTableInput) => {
        return http.post<Table>('/tables', data)
    },

    updateTable: async (id: string, data: Partial<CreateTableInput>) => {
        return http.patch<Table>(`/tables/${id}`, data)
    },

    deleteTable: async (id: string) => {
        return http.delete<void>(`/tables/${id}`)
    },

    // QR Code Endpoints
    getTableQr: async (tableId: string, restaurantId: string, restaurantName?: string) => {
        const params = new URLSearchParams()
        params.append('restaurantId', restaurantId)
        if (restaurantName) params.append('restaurantName', restaurantName)
        return http.get<TableQrData>(`/tables/${tableId}/qr?${params.toString()}`)
    },

    downloadTableQrPdf: async (tableId: string, restaurantId: string, restaurantName: string) => {
        const params = new URLSearchParams()
        params.append('restaurantId', restaurantId)
        params.append('restaurantName', restaurantName)

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1'
        const url = `${baseUrl}/tables/${tableId}/qr/pdf?${params.toString()}`

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${getCookie('access_token') || ''}`,
            },
        })

        if (!response.ok) throw new Error('PDF indirme başarısız oldu')

        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `masa-qr-${tableId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(downloadUrl)
    },

    getAllTableQrs: async (restaurantId: string, restaurantName?: string) => {
        const params = new URLSearchParams()
        if (restaurantName) params.append('restaurantName', restaurantName)
        return http.get<TableQrData[]>(`/tables/restaurants/${restaurantId}/qr/all?${params.toString()}`)
    },

    downloadAllQrsPdf: async (restaurantId: string, restaurantName: string) => {
        const params = new URLSearchParams()
        params.append('restaurantName', restaurantName)

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1'
        const url = `${baseUrl}/tables/restaurants/${restaurantId}/qr/pdf?${params.toString()}`

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${getCookie('access_token') || ''}`,
            },
        })

        if (!response.ok) throw new Error('Toplu PDF indirme başarısız oldu')

        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = 'tum-masalar-qr.pdf'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(downloadUrl)
    },

    rotateQrCode: async (tableId: string) => {
        return http.post<{ success: boolean; message: string; token: string }>(`/tables/${tableId}/qr/rotate`, {})
    },
}
