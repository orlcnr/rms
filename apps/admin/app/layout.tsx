import './globals.css';
import type { ReactNode } from 'react';
import { AdminToastProvider } from '@/modules/core/components/AdminToastProvider';

export const metadata = {
  title: 'Admin Console',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AdminToastProvider>{children}</AdminToastProvider>
      </body>
    </html>
  );
}
