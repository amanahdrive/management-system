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
  ChevronDown,
  ChevronUp,
  Package,
  Tag,
  ShieldCheck,
  CreditCard,
  Clock,
  AlertOctagon,
} from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';

const MASTER_SUB_ITEMS = [
  { label: 'Paket Kursus', href: '/master-data/paket', icon: Package },
  { label: 'Promosi Campaign', href: '/master-data/promosi', icon: Tag },
  { label: 'Staff & Instruktur', href: '/master-data/staff', icon: Users },
  { label: 'Daftar Jabatan', href: '/master-data/jabatan', icon: ShieldCheck },
  { label: 'Master Kendaraan', href: '/master-data/kendaraan', icon: Car },
  { label: 'Status Pembayaran', href: '/master-data/status-pembayaran', icon: CreditCard },
  { label: 'Slot Waktu', href: '/master-data/slot-waktu', icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUiStore();

  const isMasterActive = pathname.startsWith('/master-data');
  const [masterExpanded, setMasterExpanded] = React.useState(isMasterActive);

  React.useEffect(() => {
    if (isMasterActive) {
      setMasterExpanded(true);
    }
  }, [isMasterActive]);

  const handleMasterClick = (e: React.MouseEvent) => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setMasterExpanded(true);
      return;
    }
    setMasterExpanded((prev) => !prev);
  };

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
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname === '/dashboard'
              ? 'bg-[var(--brand-primary)] text-white font-semibold'
              : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
          }`}
          title={!sidebarOpen ? 'Dashboard' : undefined}
        >
          <LayoutDashboard className="w-5 h-5 min-w-[20px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Dashboard</span>}
        </Link>

        <Link
          href="/siswa"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname.startsWith('/siswa')
              ? 'bg-[var(--brand-primary)] text-white font-semibold'
              : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
          }`}
          title={!sidebarOpen ? 'Data Siswa' : undefined}
        >
          <Users className="w-5 h-5 min-w-[20px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Data Siswa</span>}
        </Link>

        <Link
          href="/jadwal"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname.startsWith('/jadwal')
              ? 'bg-[var(--brand-primary)] text-white font-semibold'
              : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
          }`}
          title={!sidebarOpen ? 'Jadwal Sesi' : undefined}
        >
          <Calendar className="w-5 h-5 min-w-[20px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Jadwal Sesi</span>}
        </Link>

        <Link
          href="/kendaraan"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname.startsWith('/kendaraan')
              ? 'bg-[var(--brand-primary)] text-white font-semibold'
              : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
          }`}
          title={!sidebarOpen ? 'Kendaraan' : undefined}
        >
          <Car className="w-5 h-5 min-w-[20px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Kendaraan</span>}
        </Link>

        <Link
          href="/insiden"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname.startsWith('/insiden')
              ? 'bg-[var(--brand-primary)] text-white font-semibold'
              : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
          }`}
          title={!sidebarOpen ? 'Data Insiden' : undefined}
        >
          <AlertOctagon className="w-5 h-5 min-w-[20px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Data Insiden</span>}
        </Link>

        <Link
          href="/kas"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname.startsWith('/kas')
              ? 'bg-[var(--brand-primary)] text-white font-semibold'
              : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
          }`}
          title={!sidebarOpen ? 'Kas & Keuangan' : undefined}
        >
          <Wallet className="w-5 h-5 min-w-[20px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Kas & Keuangan</span>}
        </Link>

        {/* Master Data Dropdown Item */}
        <div>
          <button
            onClick={handleMasterClick}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isMasterActive
                ? 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-bold'
                : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
            }`}
            title={!sidebarOpen ? 'Master Data' : undefined}
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 min-w-[20px]" />
              {sidebarOpen && <span className="whitespace-nowrap">Master Data</span>}
            </div>
            {sidebarOpen && (
              masterExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Expanded Sub Menu List */}
          {sidebarOpen && masterExpanded && (
            <div className="pl-6 pt-1 space-y-1 border-l-2 border-[var(--brand-primary)] ml-5 my-1">
              {MASTER_SUB_ITEMS.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = pathname === sub.href;

                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isSubActive
                        ? 'bg-[var(--brand-primary)] text-white font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
                    }`}
                  >
                    <SubIcon className="w-3.5 h-3.5" />
                    <span>{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <Link
          href="/instruktur"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname.startsWith('/instruktur')
              ? 'bg-[var(--brand-primary)] text-white font-semibold'
              : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
          }`}
          title={!sidebarOpen ? 'Portal Instruktur' : undefined}
        >
          <ShieldCheck className="w-5 h-5 min-w-[20px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Portal Instruktur</span>}
        </Link>

        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname.startsWith('/settings')
              ? 'bg-[var(--brand-primary)] text-white font-semibold'
              : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
          }`}
          title={!sidebarOpen ? 'Pengaturan' : undefined}
        >
          <Settings className="w-5 h-5 min-w-[20px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Pengaturan</span>}
        </Link>
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
