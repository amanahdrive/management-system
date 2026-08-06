'use client';

import React from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Topbar } from '@/components/navigation/Topbar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MobileDrawer } from '@/components/navigation/MobileDrawer';
import { useUiStore } from '@/lib/store/ui-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUiStore();

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)]">
      <Sidebar />
      <Topbar />

      <main
        className={`pt-20 pb-20 md:pb-8 px-4 md:px-6 transition-all duration-300 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-20'
        }`}
      >
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      <BottomNav />
      <MobileDrawer />
    </div>
  );
}
