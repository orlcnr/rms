import { z } from 'zod';

const optionalDateString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? value : undefined))
  .refine(
    (value) => !value || !Number.isNaN(Date.parse(value)),
    'Enter a valid date',
  );

const optionalPositiveIntegerString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? value : undefined))
  .refine(
    (value) => !value || (/^\d+$/.test(value) && Number(value) > 0),
    'Enter a valid positive number',
  );

export const auditSearchSchema = z.object({
  search: z.string().trim().optional(),
  action: z.string().trim().optional(),
  restaurant_id: z.string().trim().optional(),
  user_name: z.string().trim().optional(),
  resource: z.string().trim().optional(),
  page: optionalPositiveIntegerString,
  limit: optionalPositiveIntegerString.refine(
    (value) => !value || Number(value) <= 100,
    'Limit cannot exceed 100',
  ),
  start_date: optionalDateString,
  end_date: optionalDateString,
});
