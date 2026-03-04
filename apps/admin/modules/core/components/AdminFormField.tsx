'use client';

import type { CSSProperties, ReactNode } from 'react';

interface AdminFormFieldProps {
  label: string;
  error?: string;
  fullWidth?: boolean;
  children: ReactNode;
}

export function AdminFormField({
  label,
  error,
  fullWidth = false,
  children,
}: AdminFormFieldProps) {
  return (
    <label
      style={{
        display: 'grid',
        gap: 8,
        gridColumn: fullWidth ? '1 / -1' : undefined,
      }}
    >
      <span style={labelStyle}>{label}</span>
      {children}
      {error ? <p style={fieldErrorStyle}>{error}</p> : null}
    </label>
  );
}

export function getAdminInputStyle(hasError: boolean): CSSProperties {
  return {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: `1px solid ${hasError ? '#dc2626' : 'var(--line)'}`,
    background: 'var(--panel)',
  };
}

export function getAdminTextAreaStyle(hasError: boolean): CSSProperties {
  return {
    ...getAdminInputStyle(hasError),
    resize: 'vertical',
    minHeight: 112,
  };
}

export const adminFieldErrorStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: '#b91c1c',
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
};

const fieldErrorStyle: CSSProperties = adminFieldErrorStyle;
