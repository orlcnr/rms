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

export const reportsFilterFormSchema = z.object({
  search: z.string().trim().optional(),
  is_active: z.enum(['all', 'active', 'suspended']).optional(),
  start_date: optionalDateString,
  end_date: optionalDateString,
  topN: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => {
        if (!value) {
          return true;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 1 && parsed <= 25;
      },
      'Top N must be between 1 and 25',
    ),
});

export const reportsSearchSchema = z.object({
  search: z.string().trim().optional(),
  is_active: z.enum(['all', 'active', 'suspended']).optional(),
  start_date: z.string().trim().optional(),
  end_date: z.string().trim().optional(),
  topN: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (!value) {
        return undefined;
      }

      const parsed = Number(value);

      if (!Number.isFinite(parsed)) {
        return undefined;
      }

      return Math.min(Math.max(Math.trunc(parsed), 1), 25);
    }),
});
