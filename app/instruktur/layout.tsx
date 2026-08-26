import React from 'react';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Portal Jadwal Instruktur — Amanah Drive',
  description: 'Portal jadwal harian dan sesi mengemudi Instruktur Amanah Drive Palembang',
  manifest: '/manifest-instruktur.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Instruktur AD',
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
  maximumScale: 1,
  userScalable: false,
};

export default function InstrukturLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] text-[var(--text-primary)] font-sans antialiased">
      {children}
    </div>
  );
}
