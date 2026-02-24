'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { authService } from '@/modules/auth/services/auth.service';
import { loginSchema, LoginInput } from '@/modules/auth/validations/login.schema';
import { useDictionary, t } from '@/modules/i18n/useDictionary';
import { Language } from '@/modules/i18n/config';
import { cn } from '@/modules/shared/utils/cn';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

type Locale = 'tr' | 'en';

interface LoginFormProps {
  locale: Language;
}

export function LoginForm({ locale }: LoginFormProps) {
  const router = useRouter();
  const dict = useDictionary(locale);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await authService.login(data);
      toast.success(t(dict, 'auth.login.loginSuccess'));
      router.push('/');
    } catch {
      toast.error(t(dict, 'auth.login.loginError'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-0.5">
            {t(dict, 'auth.login.email')}
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary-main transition-colors">
              <Mail size={16} />
            </div>
            <input
              type="email"
              {...register('email')}
              placeholder="ornek@alan.com"
              className={cn(
                "w-full bg-bg-app border border-border-light focus:border-primary-main focus:ring-1 focus:ring-primary-main/20 text-text-primary py-3 pl-11 pr-4 text-xs font-bold transition-all outline-none rounded-sm placeholder:text-text-muted/40",
                errors.email && "border-danger-main focus:border-danger-main focus:ring-danger-main/10"
              )}
            />
          </div>
          {errors.email && (
            <p className="text-danger-main text-[10px] font-bold uppercase mt-1 ml-0.5">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center px-0.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
              {t(dict, 'auth.login.password')}
            </label>
            <a href="#" className="text-[9px] font-black text-primary-main hover:text-primary-hover transition-colors uppercase tracking-widest">
              {t(dict, 'auth.login.forgotPassword')}
            </a>
          </div>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary-main transition-colors">
              <Lock size={16} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="••••••••"
              className={cn(
                "w-full bg-bg-app border border-border-light focus:border-primary-main focus:ring-1 focus:ring-primary-main/20 text-text-primary py-3 pl-11 pr-12 text-xs font-bold transition-all outline-none rounded-sm placeholder:text-text-muted/40",
                errors.password && "border-danger-main focus:border-danger-main focus:ring-danger-main/10"
              )}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-danger-main text-[10px] font-bold uppercase mt-1 ml-0.5">{errors.password.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 rounded-sm border-border-light bg-bg-app text-primary-main focus:ring-primary-main/20 transition-all cursor-pointer"
          />
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest group-hover:text-text-primary transition-colors">
            {t(dict, 'auth.login.rememberMe')}
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-6 rounded-sm bg-primary-main text-text-inverse text-[11px] font-black uppercase tracking-[0.2em] hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin" />
            <span>İŞLENİYOR...</span>
          </>
        ) : (
          <>
            <span>{t(dict, 'auth.login.loginButton')}</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </>
        )}
      </button>
    </form>
  );
}
