'use client';

import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AdminFormField,
  getAdminInputStyle,
} from '@/modules/core/components/AdminFormField';
import { AdminFormSection } from '@/modules/core/components/AdminFormSection';
import { UserFormInput, userFormSchema } from '../schemas';
import { UserFormValues } from '../types';

interface UserEditorFormProps {
  defaultValues: UserFormValues;
  restaurantOptions: Array<{ id: string; name: string }>;
  serverError?: string | null;
  submitLabel: string;
  onSubmit: (values: UserFormInput) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

const ROLE_OPTIONS = [
  'restaurant_owner',
  'manager',
  'waiter',
  'chef',
  'customer',
] as const;

export function UserEditorForm({
  defaultValues,
  restaurantOptions,
  serverError,
  submitLabel,
  onSubmit,
  onCancel,
  isEdit = false,
}: UserEditorFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormInput>({
    resolver: zodResolver(userFormSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const selectedRole = watch('role');
  const showRestaurantField = selectedRole !== 'super_admin';
  const roleOptions =
    selectedRole === 'super_admin'
      ? ['super_admin', ...ROLE_OPTIONS]
      : ROLE_OPTIONS;

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: 16 }}>
      <AdminFormSection
        title="User details"
        description="Tenant assignment and access controls are validated before submit."
      >
        <AdminFormField
          label="First name"
          error={errors.first_name?.message}
        >
          <input
            {...register('first_name')}
            placeholder="First name"
            style={getAdminInputStyle(Boolean(errors.first_name))}
          />
        </AdminFormField>
        <AdminFormField
          label="Last name"
          error={errors.last_name?.message}
        >
          <input
            {...register('last_name')}
            placeholder="Last name"
            style={getAdminInputStyle(Boolean(errors.last_name))}
          />
        </AdminFormField>
        <AdminFormField
          label="Email"
          error={errors.email?.message}
        >
          <input
            {...register('email')}
            placeholder="Email"
            style={getAdminInputStyle(Boolean(errors.email))}
          />
        </AdminFormField>
        <AdminFormField
          label="Role"
          error={errors.role?.message}
        >
          <select
            {...register('role')}
            style={getAdminInputStyle(Boolean(errors.role))}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </AdminFormField>
        {showRestaurantField ? (
          <AdminFormField
            label="Restaurant"
            error={errors.restaurant_id?.message}
          >
            <select
              {...register('restaurant_id')}
              style={getAdminInputStyle(Boolean(errors.restaurant_id))}
            >
              <option value="">Select restaurant</option>
              {restaurantOptions.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </AdminFormField>
        ) : null}
        <AdminFormField
          label={isEdit ? 'New password' : 'Password'}
          error={errors.password?.message}
        >
          <input
            {...register('password')}
            placeholder={isEdit ? 'New password (optional)' : 'Password'}
            type="password"
            style={getAdminInputStyle(Boolean(errors.password))}
          />
        </AdminFormField>
      </AdminFormSection>
      {serverError ? <p style={topLevelErrorStyle}>{serverError}</p> : null}
      <div style={footerStyle}>
        <button type="button" style={secondaryButtonStyle} onClick={onCancel}>
          İptal
        </button>
        <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

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
