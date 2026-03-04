'use client';

import type { CSSProperties, ReactNode } from 'react';

interface ActionModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function ActionModal({
  title,
  open,
  onClose,
  children,
}: ActionModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(event) => event.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            X
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.35)',
  backdropFilter: 'blur(4px)',
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  zIndex: 1000,
};

const panelStyle: CSSProperties = {
  width: '100%',
  maxWidth: 760,
  maxHeight: 'calc(100vh - 48px)',
  overflow: 'auto',
  background: 'var(--panel)',
  border: '1px solid var(--line)',
  borderRadius: 24,
  padding: 24,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
};

const closeButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};
