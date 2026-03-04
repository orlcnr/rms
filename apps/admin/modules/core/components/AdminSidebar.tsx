'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV_ITEMS } from '../types';

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 260,
        padding: 24,
        borderRight: '1px solid var(--line)',
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Platform
        </div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Admin Console</div>
      </div>
      <nav style={{ display: 'grid', gap: 8 }}>
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.disabled ? '#' : item.href}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                border: active ? '1px solid var(--primary)' : '1px solid transparent',
                background: active ? 'var(--primary-soft)' : 'transparent',
                color: item.disabled ? 'var(--text-muted)' : 'var(--text)',
                pointerEvents: item.disabled ? 'none' : 'auto',
                fontWeight: 600,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
