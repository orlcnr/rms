import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import { SystemSync } from '@/modules/shared/components/SystemSync';

export const metadata: Metadata = {
  title: 'Restaurant Management System',
  description: 'Restaurant yönetim sistemi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      </head>
      <body className="font-display bg-bg-app text-text-primary min-h-screen selection:bg-primary-main/10 selection:text-primary-main">
        <SystemSync />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
