'use client';

import { formatAdminErrorMessage } from '@/modules/shared/errors';

export default function AdminError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const message = formatAdminErrorMessage(error);

  return (
    <main style={{ padding: 32 }}>
      <div
        style={{
          maxWidth: 720,
          padding: 24,
          borderRadius: 20,
          border: '1px solid #fecaca',
          background: '#fef2f2',
        }}
      >
        <h1 style={{ marginTop: 0 }}>Module request failed</h1>
        <p style={{ color: '#7f1d1d' }}>{message}</p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            background: 'var(--primary)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    </main>
  );
}
