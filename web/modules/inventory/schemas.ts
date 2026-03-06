import { z } from 'zod'
import { differenceInCalendarDays, parseISO } from 'date-fns'

export const movementFilterSchema = z
    .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
    })
    .refine((data) => {
        if (!data.startDate || !data.endDate) return true
        const start = parseISO(data.startDate)
        const end = parseISO(data.endDate)
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false
        return differenceInCalendarDays(end, start) >= 0
    }, { message: 'Bitiş tarihi başlangıç tarihinden önce olamaz.' })
    .refine((data) => {
        if (!data.startDate || !data.endDate) return true
        const start = parseISO(data.startDate)
        const end = parseISO(data.endDate)
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false
        return differenceInCalendarDays(end, start) <= 31
    }, { message: 'Tarih aralığı 31 günden fazla olamaz' })

export type MovementFilterInput = z.infer<typeof movementFilterSchema>
