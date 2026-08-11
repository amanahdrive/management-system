import React from 'react';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Portal Finance — Amanah Drive',
  description: 'PWA Pencatatan Kas dan Keuangan Amanah Drive Palembang',
  manifest: '/manifest-finance.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Finance AD',
  },
  icons: {
    icon: '/assets/app-icon-1024.png',
    apple: '/assets/app-icon-1024.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F7A73',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] font-sans antialiased transition-colors duration-200">
      {children}
    </div>
  );
}
