'use client';

import type { CSSProperties, ReactNode } from 'react';

interface IconActionButtonProps {
  label: string;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'warn';
  href?: string;
  icon?: ReactNode;
  iconName?:
    | 'open'
    | 'edit'
    | 'toggle-on'
    | 'toggle-off'
    | 'key'
    | 'reset-password';
}

export function IconActionButton({
  label,
  title,
  onClick,
  disabled,
  tone = 'default',
  href,
  icon,
  iconName,
}: IconActionButtonProps) {
  const style = {
    ...baseStyle,
    ...(toneStyles[tone] || toneStyles.default),
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  } satisfies CSSProperties;

  if (href) {
    return (
      <a href={href} title={title} style={style}>
        {icon || (iconName ? <Glyph name={iconName} /> : label)}
      </a>
    );
  }

  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled} style={style}>
      {icon || (iconName ? <Glyph name={iconName} /> : label)}
    </button>
  );
}

function Glyph({
  name,
}: {
  name: NonNullable<IconActionButtonProps['iconName']>;
}) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (name === 'open') {
    return (
      <svg {...common}>
        <path d="M14 3h7v7" />
        <path d="M10 14 21 3" />
        <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
      </svg>
    );
  }

  if (name === 'edit') {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }

  if (name === 'toggle-on') {
    return (
      <svg {...common}>
        <path d="M16 12h-8" />
        <path d="M12 8v8" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }

  if (name === 'key') {
    return (
      <svg {...common}>
        <circle cx="8.5" cy="15.5" r="3.5" />
        <path d="M12 15.5h9" />
        <path d="M18 12.5v6" />
        <path d="M21 13.5v4" />
      </svg>
    );
  }

  if (name === 'reset-password') {
    return (
      <svg {...common}>
        <path d="M20 11a8 8 0 1 0 2 5.3" />
        <path d="M20 4v7h-7" />
        <path d="M12 15l2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M8 12h8" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

const baseStyle: CSSProperties = {
  width: 34,
  height: 34,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  border: '1px solid var(--line)',
  fontSize: 11,
  fontWeight: 700,
  textDecoration: 'none',
};

const toneStyles = {
  default: {
    background: '#fff',
    color: 'var(--text)',
  },
  primary: {
    background: 'var(--primary-soft)',
    color: 'var(--primary)',
    border: '1px solid rgba(37, 99, 235, 0.25)',
  },
  warn: {
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d',
  },
} as const;
