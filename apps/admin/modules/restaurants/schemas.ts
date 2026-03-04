import { z } from 'zod';

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? value : undefined));

export const restaurantFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain lowercase letters, numbers, or dashes'),
  description: optionalTrimmedString,
  address: z.string().trim().min(5, 'Address must be at least 5 characters'),
  contact_email: z.string().trim().email('Enter a valid contact email'),
  contact_phone: optionalTrimmedString,
  owner_email: z.string().trim().email('Enter a valid owner email'),
  owner_first_name: z
    .string()
    .trim()
    .min(2, 'Owner first name must be at least 2 characters'),
  owner_last_name: z
    .string()
    .trim()
    .min(2, 'Owner last name must be at least 2 characters'),
  google_comment_url: optionalTrimmedString.refine(
    (value) => !value || /^https?:\/\//.test(value),
    'Google review URL must be a valid URL',
  ),
});

export const restaurantSearchSchema = z.object({
  search: z.string().trim().optional(),
});

export type RestaurantFormInput = z.infer<typeof restaurantFormSchema>;
