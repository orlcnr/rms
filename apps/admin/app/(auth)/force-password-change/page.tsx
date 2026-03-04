'use client';

import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminToast } from '@/modules/core/components/AdminToastProvider';
import {
  AdminFormField,
  getAdminInputStyle,
} from '@/modules/core/components/AdminFormField';
import { AdminFormSection } from '@/modules/core/components/AdminFormSection';
import {
  ChangePasswordInput,
  changePasswordSchema,
} from '@/modules/auth/schemas';
import {
  changeSuperAdminPassword,
  refreshSuperAdminAccess,
} from '@/modules/auth/service';

export default function ForcePasswordChangePage() {
  const router = useRouter();
  const { showToast } = useAdminToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: ChangePasswordInput) {
    try {
      await changeSuperAdminPassword(values.password);
      const refreshed = await refreshSuperAdminAccess();
      document.cookie = `admin_access_token=${refreshed.access_token}; path=/; max-age=${60 * 15}; samesite=lax`;
      showToast({
        tone: 'success',
        title: 'Password updated',
        message: 'Your account is ready to use.',
      });
      router.push('/dashboard');
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'Password update failed';
      showToast({
        tone: 'error',
        title: 'Password update failed',
        message,
      });
      setError('root', {
        message,
      });
    }
  }

  return (
    <main style={pageStyle}>
      <form onSubmit={handleSubmit(onSubmit)} style={panelStyle}>
        <div>
          <div style={eyebrowStyle}>Security Checkpoint</div>
          <h1 style={{ margin: '8px 0 0' }}>Update your password</h1>
          <p style={summaryStyle}>
            Your account is marked for mandatory rotation. Set a new password to
            continue to the admin panel.
          </p>
        </div>
        <AdminFormSection columns={1}>
          <AdminFormField label="New password" error={errors.password?.message}>
            <input
              {...register('password')}
              type="password"
              style={getAdminInputStyle(Boolean(errors.password))}
            />
          </AdminFormField>
          <AdminFormField
            label="Confirm password"
            error={errors.confirmPassword?.message}
          >
            <input
              {...register('confirmPassword')}
              type="password"
              style={getAdminInputStyle(Boolean(errors.confirmPassword))}
            />
          </AdminFormField>
        </AdminFormSection>
        {errors.root?.message ? (
          <p style={fieldErrorStyle}>{errors.root.message}</p>
        ) : null}
        <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
          {isSubmitting ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: 24,
};

const panelStyle: CSSProperties = {
  width: '100%',
  maxWidth: 460,
  display: 'grid',
  gap: 16,
  padding: 28,
  borderRadius: 24,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

const summaryStyle: CSSProperties = {
  margin: '8px 0 0',
  color: 'var(--text-muted)',
};

const fieldErrorStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: '#b91c1c',
};

const primaryButtonStyle: CSSProperties = {
  padding: '12px 16px',
  borderRadius: 14,
  border: 'none',
  background: 'var(--primary)',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};
