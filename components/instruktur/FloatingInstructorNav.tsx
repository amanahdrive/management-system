'use client';

import React from 'react';
import { LiquidGlassBottomNav, LiquidNavItem } from '@/components/navigation/LiquidGlassBottomNav';
import { Camera, Calendar, Users, Wallet, UserCheck } from 'lucide-react';

interface FloatingInstructorNavProps {
  currentTab: 'jadwal' | 'siswa' | 'gaji' | 'profil';
  onSelectTab: (tab: 'jadwal' | 'siswa' | 'gaji' | 'profil') => void;
  todaySessionsCount: number;
  onQuickAction?: () => void;
}

export function FloatingInstructorNav({
  currentTab,
  onSelectTab,
  todaySessionsCount,
  onQuickAction,
}: FloatingInstructorNavProps) {
  const leftItems: [LiquidNavItem, LiquidNavItem] = [
    {
      id: 'jadwal',
      label: 'Jadwal',
      icon: Calendar,
      badge: todaySessionsCount > 0 ? todaySessionsCount : undefined,
      onClick: () => onSelectTab('jadwal'),
    },
    {
      id: 'siswa',
      label: 'Siswa',
      icon: Users,
      onClick: () => onSelectTab('siswa'),
    },
  ];

  const rightItems: [LiquidNavItem, LiquidNavItem] = [
    {
      id: 'gaji',
      label: 'Komisi',
      icon: Wallet,
      onClick: () => onSelectTab('gaji'),
    },
    {
      id: 'profil',
      label: 'Profil',
      icon: UserCheck,
      onClick: () => onSelectTab('profil'),
    },
  ];

  return (
    <LiquidGlassBottomNav
      leftItems={leftItems}
      rightItems={rightItems}
      activeId={currentTab}
      centerAction={{
        icon: Camera,
        label: 'Presensi Sesi',
        title: 'Presensi / Mulai Sesi',
        onClick: onQuickAction || (() => onSelectTab('jadwal')),
      }}
    />
  );
}
