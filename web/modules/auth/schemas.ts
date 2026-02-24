import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz.'),
  password: z.string().min(1, 'Şifre alanı zorunludur.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
