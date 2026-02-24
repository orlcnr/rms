import { z } from 'zod'

export const categorySchema = z.object({
    name: z.string().min(1, 'Kategori adı zorunludur'),
    description: z.string().optional(),
    restaurant_id: z.string().uuid('Geçerli bir restoran ID giriniz'),
})

export const menuItemSchema = z.object({
    name: z.string().min(1, 'Ürün adı zorunludur'),
    description: z.string().optional(),
    price: z.number().min(0, 'Fiyat 0 veya daha fazla olmalıdır'),
    image_url: z.string().url('Geçerli bir URL giriniz').optional().or(z.literal('')),
    is_available: z.boolean().default(true),
    track_inventory: z.boolean().default(false),
    category_id: z.string().uuid('Geçerli bir kategori ID giriniz'),
})

export type CategoryInput = z.infer<typeof categorySchema>
export type MenuItemInput = z.infer<typeof menuItemSchema>
