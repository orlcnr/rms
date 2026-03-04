'use client';

import type { CSSProperties, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { ...toast, id }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        dismissToast(toast.id);
      }, 3200),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissToast, toasts]);

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={viewportStyle}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              ...toastStyle,
              ...(toneStyles[toast.tone] || toneStyles.info),
            }}
          >
            <div style={toastHeaderStyle}>
              <div style={toastTitleStyle}>{toast.title}</div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                style={dismissButtonStyle}
                aria-label="Dismiss notification"
              >
                x
              </button>
            </div>
            {toast.message ? <div style={toastMessageStyle}>{toast.message}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useAdminToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useAdminToast must be used within AdminToastProvider');
  }

  return context;
}

const viewportStyle: CSSProperties = {
  position: 'fixed',
  top: 20,
  right: 20,
  display: 'grid',
  gap: 10,
  zIndex: 2000,
  width: 'min(360px, calc(100vw - 40px))',
};

const toastStyle: CSSProperties = {
  borderRadius: 16,
  border: '1px solid var(--line)',
  padding: '12px 14px',
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
};

const toastHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
};

const toastTitleStyle: CSSProperties = {
  fontWeight: 700,
};

const toastMessageStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 13,
};

const dismissButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'currentColor',
  fontSize: 16,
  lineHeight: 1,
  cursor: 'pointer',
  padding: 0,
};

const toneStyles = {
  success: {
    background: '#ecfdf5',
    border: '1px solid #86efac',
    color: '#166534',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
  },
  info: {
    background: '#eff6ff',
    border: '1px solid #93c5fd',
    color: '#1d4ed8',
  },
} satisfies Record<ToastTone, CSSProperties>;
