import { getCurrentSuperAdmin } from '@/modules/auth/server';

export async function AdminHeader() {
  const user = await getCurrentSuperAdmin();

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 32px 12px',
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Session
        </div>
        <div style={{ fontWeight: 700 }}>
          {user.first_name} {user.last_name}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user.email}</div>
      </div>
      <div
        style={{
          padding: '8px 12px',
          borderRadius: 999,
          border: '1px solid var(--line)',
          background: 'var(--panel)',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        {user.role}
      </div>
    </header>
  );
}
