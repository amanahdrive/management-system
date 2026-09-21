import React from 'react';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Portal PIC Armada — Amanah Drive',
  description: 'Manajemen Operasional, Telemetri, Odometer & Servis Armada Amanah Drive Palembang',
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
      {children}
    </div>
  );
}
