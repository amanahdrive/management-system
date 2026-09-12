'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Topbar } from '@/components/navigation/Topbar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MobileDrawer } from '@/components/navigation/MobileDrawer';
import { PwaHistoryIsolation } from '@/components/shared/PwaHistoryIsolation';
import { useUiStore } from '@/lib/store/ui-store';
import {
  isAdminRoute,
  checkIsFinanceMode,
  clearFinanceMode,
  isStandalonePwa,
} from '@/lib/utils/finance-mode';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUiStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isFinanceMode, setIsFinanceMode] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateMode = () => {
      // Jika berada di rute Admin Console (/dashboard, /siswa, /jadwal, dll.), Finance mode DILARANG aktif
      if (isAdminRoute(pathname)) {
        clearFinanceMode();
        setIsFinanceMode(false);
        return;
      }

      const isFin = checkIsFinanceMode(pathname);
      setIsFinanceMode(isFin);

      // Hanya redirect ke /finance jika sedang di STANDALONE PWA (aplikasi mobile terinstal)
      // dan berada di luar modul kas/nota
      if (isFin && isStandalonePwa()) {
        const isAllowedKas =
          pathname.startsWith('/kas') ||
          pathname.startsWith('/nota') ||
          pathname.startsWith('/finance');
        if (!isAllowedKas) {
          router.replace('/finance');
        }
      }
    };

    updateMode();

    const handleModeChange = () => updateMode();
    window.addEventListener('amanah:finance-mode-change', handleModeChange);
    return () => {
      window.removeEventListener('amanah:finance-mode-change', handleModeChange);
    };
  }, [pathname, router]);

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)]">
      {/* Khusus mode Finance standalone, aktifkan isolasi tombol back */}
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
