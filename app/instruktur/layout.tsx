import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal Jadwal Instruktur — Amanah Drive',
  description: 'Portal khusus view-only jadwal harian dan kontak siswa untuk instruktur mengemudi Amanah Drive',
};

export default function InstrukturLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] text-[var(--text-primary)] font-sans antialiased">
      {children}
    </div>
  );
}
