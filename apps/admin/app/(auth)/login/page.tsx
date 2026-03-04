'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AdminFormField,
  getAdminInputStyle,
} from '@/modules/core/components/AdminFormField';
import { LoginInput, loginSchema } from '@/modules/auth/schemas';
import { loginSuperAdmin } from '@/modules/auth/service';

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginInput) {
    try {
      const result = await loginSuperAdmin(values.email, values.password);
      document.cookie = `admin_access_token=${result.access_token}; path=/; max-age=${60 * 15}; samesite=lax`;
      router.push(result.must_change_password ? '/force-password-change' : '/dashboard');
    } catch (submissionError) {
      setError('root', {
        message:
          submissionError instanceof Error ? submissionError.message : 'Login failed',
      });
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 24,
          padding: 28,
          display: 'grid',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Restricted Area
          </div>
          <h1 style={{ margin: '8px 0 0' }}>Super Admin Login</h1>
        </div>
        <AdminFormField label="Email" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            style={getAdminInputStyle(Boolean(errors.email))}
          />
        </AdminFormField>
        <AdminFormField label="Password" error={errors.password?.message}>
          <input
            {...register('password')}
            type="password"
            style={getAdminInputStyle(Boolean(errors.password))}
          />
        </AdminFormField>
        {errors.root?.message ? (
          <p style={{ margin: 0, color: '#b91c1c' }}>{errors.root.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            border: 'none',
            background: 'var(--primary)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
