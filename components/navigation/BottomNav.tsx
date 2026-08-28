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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg)]/90 backdrop-blur-xl border-t border-[var(--border)] h-16 flex items-center justify-around px-2 shadow-lg">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full py-1 text-[10px] font-semibold transition-all ${
              isActive
                ? 'text-[var(--brand-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--brand-primary)]'
            }`}
          >
            <div className={`p-1 rounded-full transition-all ${isActive ? 'bg-[var(--brand-primary-light)]' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="mt-0.5">{item.label}</span>
          </Link>
        );
      })}

      {/* Menu 'Lainnya' Button */}
      <button
        onClick={toggleMobileDrawer}
        aria-label="Buka Menu Navigasi Lainnya"
        className="flex flex-col items-center justify-center w-full py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
      >
        <div className="p-1 rounded-full">
          <Menu className="w-5 h-5" />
        </div>
        <span className="mt-0.5">Lainnya</span>
      </button>
    </nav>
  );
}
