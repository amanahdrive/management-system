import React from 'react';
import type { Metadata, Viewport } from 'next';
import { PwaHistoryIsolation } from '@/components/shared/PwaHistoryIsolation';

export const metadata: Metadata = {
  title: 'Portal PIC Armada — Amanah Drive',
  description: 'PWA Manajemen Operasional, Telemetri, Odometer, BBM & Servis Armada Amanah Drive Palembang',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Amanah Console',
  },
  icons: {
    icon: '/assets/app-icon-1024.png',
    apple: '/assets/app-icon-1024.png',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0F7A73',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function ArmadaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] text-[var(--text-primary)] font-sans antialiased transition-colors duration-200 selection:bg-emerald-500/20 selection:text-emerald-700">
      <PwaHistoryIsolation />
      {children}
    </div>
  );
}
