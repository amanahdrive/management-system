'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  Tag,
  Users,
  ShieldCheck,
  Car,
  CreditCard,
  Clock,
} from 'lucide-react';

export const MASTER_DATA_SUB_ITEMS = [
  { label: 'Paket Kursus', href: '/master-data/paket', icon: Package },
  { label: 'Promosi', href: '/master-data/promosi', icon: Tag },
  { label: 'Staff & Instruktur', href: '/master-data/staff', icon: Users },
  { label: 'Jabatan', href: '/master-data/jabatan', icon: ShieldCheck },
  { label: 'Master Kendaraan', href: '/master-data/kendaraan', icon: Car },
  { label: 'Status Pembayaran', href: '/master-data/status-pembayaran', icon: CreditCard },
  { label: 'Slot Waktu', href: '/master-data/slot-waktu', icon: Clock },
];

export function MasterDataSubNav() {
  const pathname = usePathname();

  return (
    <div className="card-container p-2 mb-6 overflow-x-auto flex items-center gap-1.5 bg-[var(--bg-subtle)] border border-[var(--border)]">
      {MASTER_DATA_SUB_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--brand-primary)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
