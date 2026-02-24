import { z } from 'zod'

export const restaurantSchema = z.object({
    name: z.string().min(1, 'Restoran adı zorunludur'),
    description: z.string().optional(),
    address: z.string().min(1, 'Adres zorunludur'),
    contact_email: z.string().email('Geçerli bir e-posta adresi giriniz').optional().or(z.literal('')),
    contact_phone: z.string().optional(),
    opening_hours: z.record(z.any()).optional(),
    google_comment_url: z.string().url('Geçerli bir URL giriniz').optional().or(z.literal('')),
    instagram_url: z.string().url('Geçerli bir URL giriniz').optional().or(z.literal('')),
    facebook_url: z.string().url('Geçerli bir URL giriniz').optional().or(z.literal('')),
    twitter_url: z.string().url('Geçerli bir URL giriniz').optional().or(z.literal('')),
    website_url: z.string().url('Geçerli bir URL giriniz').optional().or(z.literal('')),
})

export type RestaurantInput = z.infer<typeof restaurantSchema>
