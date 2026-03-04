'use client';

import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AdminFormField,
  getAdminInputStyle,
} from '@/modules/core/components/AdminFormField';
import { AdminFormSection } from '@/modules/core/components/AdminFormSection';
import {
  UserPasswordResetInput,
  userPasswordResetSchema,
} from '../schemas';

interface PasswordResetFormProps {
  serverError?: string | null;
  onSubmit: (password?: string) => Promise<void>;
  onCancel: () => void;
}

export function PasswordResetForm({
  serverError,
  onSubmit,
  onCancel,
}: PasswordResetFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserPasswordResetInput>({
    resolver: zodResolver(userPasswordResetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values.password))}
      style={{ display: 'grid', gap: 16 }}
    >
      <p style={helperStyle}>
        Leave the password fields empty to let the backend generate a secure
        temporary password and send it by email.
      </p>
      <AdminFormSection columns={1}>
        <AdminFormField label="New password" error={errors.password?.message}>
          <input
            {...register('password')}
            type="password"
            placeholder="Optional"
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
            placeholder="Repeat password"
            style={getAdminInputStyle(Boolean(errors.confirmPassword))}
          />
        </AdminFormField>
      </AdminFormSection>
      {serverError ? <p style={topLevelErrorStyle}>{serverError}</p> : null}
      <div style={footerStyle}>
        <button type="button" style={secondaryButtonStyle} onClick={onCancel}>
          İptal
        </button>
        <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
          {isSubmitting ? 'Updating...' : 'Reset password'}
        </button>
      </div>
    </form>
  );
}

const helperStyle: CSSProperties = {
  margin: 0,
  color: 'var(--text-muted)',
};

const topLevelErrorStyle: CSSProperties = {
  margin: 0,
  color: '#b91c1c',
};

const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
  paddingTop: 12,
  borderTop: '1px solid var(--line)',
};

const primaryButtonStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: 'none',
  background: 'var(--primary)',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButtonStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};
