'use client';

import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AdminFormField,
  getAdminInputStyle,
  getAdminTextAreaStyle,
} from '@/modules/core/components/AdminFormField';
import { AdminFormSection } from '@/modules/core/components/AdminFormSection';
import {
  RestaurantFormInput,
  restaurantFormSchema,
} from '../schemas';
import { RestaurantFormValues } from '../types';

interface RestaurantEditorFormProps {
  defaultValues: RestaurantFormValues;
  serverError?: string | null;
  submitLabel: string;
  onSubmit: (values: RestaurantFormInput) => Promise<void>;
  onCancel: () => void;
}

export function RestaurantEditorForm({
  defaultValues,
  serverError,
  submitLabel,
  onSubmit,
  onCancel,
}: RestaurantEditorFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RestaurantFormInput>({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: 16 }}>
      <AdminFormSection
        title="Restaurant details"
        description="Core tenant identity, contact channels, and ownership details."
      >
        <AdminFormField
          label="Name"
          error={errors.name?.message}
        >
          <input
            {...register('name')}
            placeholder="Name"
            style={getAdminInputStyle(Boolean(errors.name))}
          />
        </AdminFormField>
        <AdminFormField
          label="Slug"
          error={errors.slug?.message}
        >
          <input
            {...register('slug')}
            placeholder="Slug"
            style={getAdminInputStyle(Boolean(errors.slug))}
          />
        </AdminFormField>
        <AdminFormField
          label="Address"
          error={errors.address?.message}
        >
          <input
            {...register('address')}
            placeholder="Address"
            style={getAdminInputStyle(Boolean(errors.address))}
          />
        </AdminFormField>
        <AdminFormField
          label="Contact email"
          error={errors.contact_email?.message}
        >
          <input
            {...register('contact_email')}
            placeholder="Contact email"
            style={getAdminInputStyle(Boolean(errors.contact_email))}
          />
        </AdminFormField>
        <AdminFormField
          label="Contact phone"
          error={errors.contact_phone?.message}
        >
          <input
            {...register('contact_phone')}
            placeholder="Contact phone"
            style={getAdminInputStyle(Boolean(errors.contact_phone))}
          />
        </AdminFormField>
        <AdminFormField
          label="Google review URL"
          error={errors.google_comment_url?.message}
        >
          <input
            {...register('google_comment_url')}
            placeholder="Google review URL"
            style={getAdminInputStyle(Boolean(errors.google_comment_url))}
          />
        </AdminFormField>
        <AdminFormField
          label="Owner email"
          error={errors.owner_email?.message}
        >
          <input
            {...register('owner_email')}
            placeholder="Owner email"
            style={getAdminInputStyle(Boolean(errors.owner_email))}
          />
        </AdminFormField>
        <AdminFormField
          label="Owner first name"
          error={errors.owner_first_name?.message}
        >
          <input
            {...register('owner_first_name')}
            placeholder="Owner first name"
            style={getAdminInputStyle(Boolean(errors.owner_first_name))}
          />
        </AdminFormField>
        <AdminFormField
          label="Owner last name"
          error={errors.owner_last_name?.message}
        >
          <input
            {...register('owner_last_name')}
            placeholder="Owner last name"
            style={getAdminInputStyle(Boolean(errors.owner_last_name))}
          />
        </AdminFormField>
        <AdminFormField
          label="Description"
          error={errors.description?.message}
          fullWidth
        >
          <textarea
            {...register('description')}
            placeholder="Description"
            rows={4}
            style={getAdminTextAreaStyle(Boolean(errors.description))}
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
