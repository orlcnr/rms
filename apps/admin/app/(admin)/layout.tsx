import type { ReactNode } from 'react';
import { AdminHeader } from '@/modules/core/components/AdminHeader';
import { AdminSidebar } from '@/modules/core/components/AdminSidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <AdminSidebar />
      <div style={{ flex: 1 }}>
        <AdminHeader />
        <main style={{ padding: '12px 32px 32px' }}>{children}</main>
      </div>
    </div>
  );
}
