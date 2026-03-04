import { z } from 'zod';

const USER_ROLE_VALUES = [
  'super_admin',
  'restaurant_owner',
  'manager',
  'waiter',
  'chef',
  'customer',
] as const;

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? value : undefined));

export const userFormSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email address'),
    first_name: z
      .string()
      .trim()
      .min(2, 'First name must be at least 2 characters'),
    last_name: z
      .string()
      .trim()
      .min(2, 'Last name must be at least 2 characters'),
    role: z.enum(USER_ROLE_VALUES),
    restaurant_id: optionalTrimmedString,
    password: optionalTrimmedString.refine(
      (value) => !value || value.length >= 12,
      'Password must be at least 12 characters',
    ),
  })
  .superRefine((value, ctx) => {
    if (value.role !== 'super_admin' && !value.restaurant_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['restaurant_id'],
        message: 'Restaurant selection is required',
      });
    }
  });

export const userSearchSchema = z.object({
  search: z.string().trim().optional(),
});

export const userPasswordResetSchema = z
  .object({
    password: optionalTrimmedString.refine(
      (value) => !value || value.length >= 12,
      'Password must be at least 12 characters',
    ),
    confirmPassword: optionalTrimmedString,
  })
  .superRefine((value, ctx) => {
    if (value.password && value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

export type UserFormInput = z.infer<typeof userFormSchema>;
export type UserPasswordResetInput = z.infer<typeof userPasswordResetSchema>;
