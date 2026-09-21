'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Wallet,
  Car,
  Menu,
  Plus,
} from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { LiquidGlassBottomNav, LiquidNavItem } from './LiquidGlassBottomNav';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleMobileDrawer } = useUiStore();
  const { user } = useAuthStore();

  const isDev = user?.roles?.includes('developer') ?? false;
  const hasFinance = user?.roles?.includes('keuangan') ?? false;
  const hasSiswa = user?.roles?.includes('siswa') ?? false;
  const hasArmada = user?.roles?.includes('armada') ?? false;
  const hasInstruktur = user?.roles?.includes('instruktur') ?? false;

  // Decide 2 left items & 2 right items based on active roles
  // 1st Item is always Dashboard
  const leftItem1: LiquidNavItem = {
    id: 'dashboard',
    label: 'Beranda',
    href: '/dashboard',
    icon: LayoutDashboard,
  };

  // 2nd Item: Siswa if permitted, or Armada, or Keuangan
  const leftItem2: LiquidNavItem = hasSiswa || isDev
    ? { id: 'siswa', label: 'Siswa', href: '/siswa', icon: Users }
    : hasArmada
    ? { id: 'kendaraan', label: 'Armada', href: '/kendaraan', icon: Car }
    : hasFinance
    ? { id: 'kas', label: 'Kas', href: '/kas', icon: Wallet }
    : { id: 'instruktur', label: 'Jadwal', href: '/instruktur', icon: Calendar };

  // 3rd Item: Kas if finance/dev, or Jadwal, or Kendaraan
  const rightItem1: LiquidNavItem = hasFinance || isDev
    ? { id: 'kas', label: 'Kas', href: '/kas', icon: Wallet }
    : hasArmada
    ? { id: 'kendaraan', label: 'Armada', href: '/kendaraan', icon: Car }
    : { id: 'jadwal', label: 'Jadwal', href: '/jadwal', icon: Calendar };

  // 4th Item: Always Menu drawer
  const rightItem2: LiquidNavItem = {
    id: 'menu',
    label: 'Menu',
    icon: Menu,
    onClick: toggleMobileDrawer,
  };

  const leftItems: [LiquidNavItem, LiquidNavItem] = [leftItem1, leftItem2];
  const rightItems: [LiquidNavItem, LiquidNavItem] = [rightItem1, rightItem2];

  const activeId =
    pathname === '/dashboard'
      ? 'dashboard'
      : pathname.startsWith('/siswa') || pathname.startsWith('/sim')
      ? 'siswa'
      : pathname.startsWith('/kas') || pathname.startsWith('/nota')
      ? 'kas'
      : pathname.startsWith('/kendaraan') || pathname.startsWith('/insiden')
      ? 'kendaraan'
      : pathname.startsWith('/jadwal') || pathname.startsWith('/instruktur')
      ? 'jadwal'
      : 'menu';

  return (
    <div className="md:hidden">
      <LiquidGlassBottomNav
        leftItems={leftItems}
        rightItems={rightItems}
        activeId={activeId}
        centerAction={{
          icon: Plus,
          label: 'Aksi Cepat',
          title: 'Menu Navigasi Lengkap',
          onClick: toggleMobileDrawer,
        }}
      />
    </div>
  );
}
