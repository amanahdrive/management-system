'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Car,
  Wallet,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';

const NAVIGATION_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Data Siswa', href: '/siswa', icon: Users },
  { label: 'Jadwal Sesi', href: '/jadwal', icon: Calendar },
  { label: 'Kendaraan', href: '/kendaraan', icon: Car },
  { label: 'Kas & Keuangan', href: '/kas', icon: Wallet },
  { label: 'Master Data', href: '/master-data/paket', icon: Database },
  { label: 'Pengaturan', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUiStore();

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-[var(--bg)] border-r border-[var(--border)] transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)]">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <Image
            src="/assets/logo-amdri-symbol.png"
            alt="Amanah Drive Symbol"
            width={36}
            height={36}
            className="object-contain min-w-[36px]"
          />
          {sidebarOpen && (
            <span className="font-bold text-lg text-[var(--brand-primary)] whitespace-nowrap">
              Amanah Drive
            </span>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)]"
          title={sidebarOpen ? 'Ciutkan Sidebar' : 'Buka Sidebar'}
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--brand-primary)] text-white font-semibold'
                  : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon className="w-5 h-5 min-w-[20px]" />
              {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      {sidebarOpen && (
        <div className="p-4 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">Amanah Drive v1.0</p>
          <p>Palembang, Sumatera Selatan</p>
        </div>
      )}
    </aside>
  );
}
