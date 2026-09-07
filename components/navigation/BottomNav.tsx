'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Car, Menu } from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';
import { sound } from '@/lib/sound/SoundFX';

import { LiquidGlassBottomNav, LiquidNavItem } from './LiquidGlassBottomNav';
import { Plus } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const { toggleMobileDrawer } = useUiStore();

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
