import React from 'react';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Portal Jadwal Instruktur — Amanah Drive',
  description: 'Portal khusus view-only jadwal harian dan kontak siswa untuk instruktur mengemudi Amanah Drive',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Instruktur Drive',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
};

export default function InstrukturLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] text-[var(--text-primary)] font-sans antialiased">
      {children}
    </div>
  );
}
