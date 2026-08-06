'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Car, Menu } from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';

export function BottomNav() {
  const pathname = usePathname();
  const { toggleMobileDrawer } = useUiStore();

  const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Siswa', href: '/siswa', icon: Users },
    { label: 'Jadwal', href: '/jadwal', icon: Calendar },
    { label: 'Kendaraan', href: '/kendaraan', icon: Car },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg)] border-t border-[var(--border)] h-16 flex items-center justify-around px-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-[var(--brand-primary)] font-bold' : 'text-[var(--text-secondary)]'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Menu 'Lainnya' Button */}
      <button
        onClick={toggleMobileDrawer}
        className="flex flex-col items-center justify-center w-full py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span>Lainnya</span>
      </button>
    </nav>
  );
}
