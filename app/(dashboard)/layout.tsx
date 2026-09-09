'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Topbar } from '@/components/navigation/Topbar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MobileDrawer } from '@/components/navigation/MobileDrawer';
import { PwaHistoryIsolation } from '@/components/shared/PwaHistoryIsolation';
import { useUiStore } from '@/lib/store/ui-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUiStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isFinanceMode, setIsFinanceMode] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const isFin =
        sessionStorage.getItem('amanah_finance_mode') === 'true' ||
        localStorage.getItem('amanah_finance_mode') === 'true';
      setIsFinanceMode(isFin);

      // Kunci Finance App: Jika mode finance aktif dan pengguna berada di luar modul Kas & Keuangan / Nota, redirect langsung ke /finance
      if (isFin) {
        const isAllowedKas =
          pathname.startsWith('/kas') ||
          pathname.startsWith('/nota') ||
          pathname.startsWith('/finance');
        if (!isAllowedKas) {
          console.warn('[Finance Scope Guard] Rute admin diblokir dalam mode Finance:', pathname);
          router.replace('/finance');
        }
      }
    }
  }, [pathname, router]);

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)]">
      {/* Jika dalam mode Finance, aktifkan isolasi tombol back pada seluruh submenu Kas */}
      {isFinanceMode && <PwaHistoryIsolation />}

      <Sidebar />
      <Topbar />

      <main
        className={`pt-20 pb-32 md:pb-8 px-4 md:px-6 transition-all duration-300 ${
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
