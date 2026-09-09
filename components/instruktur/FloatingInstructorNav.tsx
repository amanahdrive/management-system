'use client';

import React from 'react';
import { LiquidGlassBottomNav, LiquidNavItem } from '@/components/navigation/LiquidGlassBottomNav';
import { Calendar, Users, Wallet, UserCheck } from 'lucide-react';

interface FloatingInstructorNavProps {
  currentTab: 'jadwal' | 'siswa' | 'gaji' | 'profil';
  onSelectTab: (tab: 'jadwal' | 'siswa' | 'gaji' | 'profil') => void;
  todaySessionsCount: number;
}

export function FloatingInstructorNav({
  currentTab,
  onSelectTab,
  todaySessionsCount,
}: FloatingInstructorNavProps) {
  const navItems: LiquidNavItem[] = [
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
      items={navItems}
      activeId={currentTab}
    />
  );
}
