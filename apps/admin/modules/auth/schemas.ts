import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z
    .string()
    .trim()
    .min(12, 'Password must be at least 12 characters'),
});

export const changePasswordSchema = z.object({
  password: z
    .string()
    .trim()
    .min(12, 'Password must be at least 12 characters'),
  confirmPassword: z
    .string()
    .trim()
    .min(12, 'Password confirmation must be at least 12 characters'),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
