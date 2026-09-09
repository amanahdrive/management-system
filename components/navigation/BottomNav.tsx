'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Car,
  Menu,
  Wallet,
  Sparkles,
  Building2,
  Plus,
} from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';
import { sound } from '@/lib/sound/SoundFX';
import { LiquidGlassBottomNav, LiquidNavItem } from './LiquidGlassBottomNav';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleMobileDrawer } = useUiStore();
  const [isFinanceMode, setIsFinanceMode] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsFinanceMode(
        sessionStorage.getItem('amanah_finance_mode') === 'true' ||
        localStorage.getItem('amanah_finance_mode') === 'true'
      );
    }
  }, []);

  // Jika dalam Finance Mode, tampilkan dock navigasi khusus Kas & Keuangan
  if (isFinanceMode) {
    const financeLeftItems: [LiquidNavItem, LiquidNavItem] = [
      { id: 'finance', label: 'Beranda', href: '/finance', icon: Wallet },
      { id: 'pos', label: 'POS', href: '/kas/pos', icon: Sparkles },
    ];

    const financeRightItems: [LiquidNavItem, LiquidNavItem] = [
      { id: 'rekening', label: 'Rekening', href: '/kas/rekening', icon: Building2 },
      { id: 'menu', label: 'Menu Kas', icon: Menu, onClick: toggleMobileDrawer },
    ];

    const financeActiveId =
      pathname === '/finance'
        ? 'finance'
        : pathname.startsWith('/kas/pos')
        ? 'pos'
        : pathname.startsWith('/kas/rekening')
        ? 'rekening'
        : 'menu';

    return (
      <div className="md:hidden">
        <LiquidGlassBottomNav
          leftItems={financeLeftItems}
          rightItems={financeRightItems}
          activeId={financeActiveId}
          centerAction={{
            icon: Plus,
            label: 'Catat Kas',
            title: 'Catat Transaksi Kas di Portal Finance',
            onClick: () => router.push('/finance'),
          }}
        />
      </div>
    );
  }

  // Mode Admin Biasa (Desktop/Mobile Admin Console)
  const leftItems: [LiquidNavItem, LiquidNavItem] = [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { id: 'siswa', label: 'Siswa', href: '/siswa', icon: Users },
  ];

  const rightItems: [LiquidNavItem, LiquidNavItem] = [
    { id: 'jadwal', label: 'Jadwal', href: '/jadwal', icon: Calendar },
    { id: 'menu', label: 'Menu', icon: Menu, onClick: toggleMobileDrawer },
  ];

  const isSiswaSection = pathname.startsWith('/siswa') || pathname.startsWith('/sim') || pathname.startsWith('/sertifikat');
  const isJadwalSection = pathname.startsWith('/jadwal');
  const isMenuSection =
    pathname.startsWith('/kas') ||
    pathname.startsWith('/kendaraan') ||
    pathname.startsWith('/insiden') ||
    pathname.startsWith('/nota') ||
    pathname.startsWith('/master-data') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/analitik');

  const activeId = pathname === '/dashboard'
    ? 'dashboard'
    : isSiswaSection
    ? 'siswa'
    : isJadwalSection
    ? 'jadwal'
    : isMenuSection
    ? 'menu'
    : '';

  return (
    <div className="md:hidden">
      <LiquidGlassBottomNav
        leftItems={leftItems}
        rightItems={rightItems}
        activeId={activeId}
        centerAction={{
          icon: Plus,
          label: 'Aksi Cepat',
          title: 'Menu Aksi Cepat',
          onClick: toggleMobileDrawer,
        }}
      />
    </div>
  );
}
