'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, Database, Settings, X } from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';

export function MobileDrawer() {
  const pathname = usePathname();
  const { mobileDrawerOpen, setMobileDrawerOpen } = useUiStore();

  if (!mobileDrawerOpen) return null;

  const EXTRA_NAV = [
    { label: 'Kas & Keuangan', href: '/kas', icon: Wallet },
    { label: 'Master Data Paket', href: '/master-data/paket', icon: Database },
    { label: 'Master Data Promosi', href: '/master-data/promosi', icon: Database },
    { label: 'Master Data Staff', href: '/master-data/staff', icon: Database },
    { label: 'Master Data Jabatan', href: '/master-data/jabatan', icon: Database },
    { label: 'Master Data Kendaraan', href: '/master-data/kendaraan', icon: Database },
    { label: 'Master Data Status Pembayaran', href: '/master-data/status-pembayaran', icon: Database },
    { label: 'Master Data Slot Waktu', href: '/master-data/slot-waktu', icon: Database },
    { label: 'Pengaturan Sistem', href: '/settings', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-4/5 max-w-xs bg-[var(--bg)] h-full p-4 flex flex-col justify-between animate-in slide-in-from-right">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
            <h3 className="font-bold text-base text-[var(--text-primary)]">Menu Lainnya</h3>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          <div className="space-y-1">
            {EXTRA_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--brand-primary)] text-white font-semibold'
                      : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">Amanah Drive Mobile</p>
          <p>Admin Internal Tool v1.0</p>
        </div>
      </div>
    </div>
  );
}
