'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Car, Menu } from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';
import { sound } from '@/lib/sound/SoundFX';

export function BottomNav() {
  const pathname = usePathname();
  const { toggleMobileDrawer } = useUiStore();

  const NAV_ITEMS = [
    { label: 'DASHBOARD', href: '/dashboard', icon: LayoutDashboard },
    { label: 'SISWA', href: '/siswa', icon: Users },
    { label: 'JADWAL', href: '/jadwal', icon: Calendar },
    { label: 'ARMADA', href: '/kendaraan', icon: Car },
  ];

  return (
    <div className="md:hidden fixed bottom-3 inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
      <nav className="pointer-events-auto max-w-md w-full bg-[var(--bg)]/95 backdrop-blur-md border border-[var(--border)] shadow-2xl flex items-center justify-between px-1 py-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => sound.playMechanicalTick()}
              className={`relative flex-1 py-1.5 flex flex-col items-center justify-center text-center transition-colors font-mono text-[9px] uppercase tracking-wider ${
                isActive
                  ? 'text-[var(--brand-primary)] font-bold bg-[var(--brand-primary-light)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 inset-x-0 h-[2px] bg-[var(--brand-primary)]" />
              )}
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Menu 'Lainnya' Button */}
        <button
          onClick={() => {
            sound.playMechanicalTick();
            toggleMobileDrawer();
          }}
          aria-label="Buka Menu Navigasi Lainnya"
          className="relative flex-1 py-1.5 flex flex-col items-center justify-center text-center transition-colors font-mono text-[9px] uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>MENU</span>
        </button>
      </nav>
    </div>
  );
}
