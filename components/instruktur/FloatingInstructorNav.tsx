'use client';

import React from 'react';
import { sound } from '@/lib/sound/SoundFX';
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
  const tabs: Array<{
    id: 'jadwal' | 'siswa' | 'gaji' | 'profil';
    label: string;
    icon: typeof Calendar;
    badge?: string;
  }> = [
    { id: 'jadwal', label: 'JADWAL', icon: Calendar, badge: todaySessionsCount > 0 ? String(todaySessionsCount) : undefined },
    { id: 'siswa', label: 'SISWA', icon: Users },
    { id: 'gaji', label: 'KOMISI', icon: Wallet },
    { id: 'profil', label: 'PROFIL', icon: UserCheck },
  ];

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
      <nav 
        className="pointer-events-auto max-w-md w-full bg-[var(--bg)]/95 backdrop-blur-md border border-[var(--border)] shadow-2xl flex items-center justify-between px-1 py-1"
        style={{ borderRadius: 0 }}
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playMechanicalTick();
                onSelectTab(tab.id);
              }}
              className={`relative flex-1 py-1.5 flex flex-col items-center justify-center text-center transition-colors font-mono text-[9px] uppercase tracking-wider ${
                isActive
                  ? 'text-[var(--brand-primary)] font-bold bg-[var(--brand-primary-light)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              style={{ borderRadius: 0 }}
            >
              {isActive && (
                <div className="absolute top-0 inset-x-0 h-[2px] bg-[var(--brand-primary)]" />
              )}
              <div className="relative">
                <Icon className="w-4 h-4 mb-0.5" />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 text-[8px] font-mono bg-emerald-600 text-white font-bold">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
