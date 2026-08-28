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
  Receipt,
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

  const handleMasterClick = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setMasterExpanded(true);
      return;
    }
    setMasterExpanded((prev) => !prev);
  };

  const navItemClass = (isActive: boolean) =>
    `group relative flex items-center ${
      sidebarOpen ? 'gap-3 px-3.5' : 'justify-center px-0'
    } py-2.5 rounded-full text-xs font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-[var(--brand-primary)] text-white shadow-[0_2px_12px_var(--brand-glow)]'
        : 'text-[var(--text-secondary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
    }`;

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-[var(--bg)]/95 backdrop-blur-xl border-r border-[var(--border)] transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`h-16 flex items-center border-b border-[var(--border)] ${
          sidebarOpen ? 'justify-between px-4' : 'justify-center px-2'
        }`}
      >
        {sidebarOpen ? (
          <>
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <Image
                src="/assets/logo-amdri-symbol.png"
                alt="Amanah Drive Symbol"
                width={32}
                height={32}
                className="object-contain shrink-0"
              />
              <span className="font-brand font-bold text-base text-[var(--brand-primary)] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                Amanah Drive
              </span>
            </Link>
            <button
              onClick={toggleSidebar}
              aria-label="Ciutkan Sidebar"
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] transition-colors shrink-0"
              title="Ciutkan Sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            onClick={toggleSidebar}
            aria-label="Buka Sidebar"
            title="Klik untuk membuka Sidebar"
            className="flex items-center justify-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Image
              src="/assets/logo-amdri-symbol.png"
              alt="Amanah Drive Symbol"
              width={32}
              height={32}
              className="object-contain"
            />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
        <Link
          href="/dashboard"
          className={navItemClass(pathname === '/dashboard')}
          title={!sidebarOpen ? 'Dashboard' : undefined}
        >
          <LayoutDashboard className="w-4 h-4 min-w-[16px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Dashboard</span>}
        </Link>

        <Link
          href="/siswa"
          className={navItemClass(pathname.startsWith('/siswa'))}
          title={!sidebarOpen ? 'Data Siswa' : undefined}
        >
          <Users className="w-4 h-4 min-w-[16px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Data Siswa</span>}
        </Link>

        <Link
          href="/jadwal"
          className={navItemClass(pathname.startsWith('/jadwal'))}
          title={!sidebarOpen ? 'Jadwal Sesi' : undefined}
        >
          <Calendar className="w-4 h-4 min-w-[16px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Jadwal Sesi</span>}
        </Link>

        <Link
          href="/kendaraan"
          className={navItemClass(pathname.startsWith('/kendaraan'))}
          title={!sidebarOpen ? 'Kendaraan' : undefined}
        >
          <Car className="w-4 h-4 min-w-[16px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Kendaraan</span>}
        </Link>

        <Link
          href="/insiden"
          className={navItemClass(pathname.startsWith('/insiden'))}
          title={!sidebarOpen ? 'Data Insiden' : undefined}
        >
          <AlertOctagon className="w-4 h-4 min-w-[16px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Data Insiden</span>}
        </Link>

        <Link
          href="/kas"
          className={navItemClass(pathname.startsWith('/kas'))}
          title={!sidebarOpen ? 'Kas & Keuangan' : undefined}
        >
          <Wallet className="w-4 h-4 min-w-[16px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Kas & Keuangan</span>}
        </Link>

        <Link
          href="/nota"
          className={navItemClass(pathname.startsWith('/nota'))}
          title={!sidebarOpen ? 'Cetak Nota' : undefined}
        >
          <Receipt className="w-4 h-4 min-w-[16px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Cetak Nota</span>}
        </Link>

        {/* Master Data Dropdown Item */}
        <div>
          <button
            onClick={handleMasterClick}
            className={`w-full flex items-center ${
              sidebarOpen ? 'justify-between px-3.5' : 'justify-center px-0'
            } py-2.5 rounded-full text-xs font-semibold transition-all ${
              isMasterActive
                ? 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)]'
            }`}
            title={!sidebarOpen ? 'Master Data' : undefined}
          >
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 min-w-[16px]" />
              {sidebarOpen && <span className="whitespace-nowrap">Master Data</span>}
            </div>
            {sidebarOpen && (
              masterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Expanded Sub Menu List */}
          {sidebarOpen && masterExpanded && (
            <div className="pl-4 pt-1 space-y-1 border-l-2 border-[var(--brand-primary)]/40 ml-5 my-1.5">
              {MASTER_SUB_ITEMS.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = pathname === sub.href;

                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isSubActive
                        ? 'bg-[var(--brand-primary)] text-white font-semibold shadow-xs'
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
          className={navItemClass(pathname.startsWith('/instruktur'))}
          title={!sidebarOpen ? 'Portal Instruktur' : undefined}
        >
          <ShieldCheck className="w-4 h-4 min-w-[16px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Portal Instruktur</span>}
        </Link>

        <Link
          href="/settings"
          className={navItemClass(pathname.startsWith('/settings'))}
          title={!sidebarOpen ? 'Pengaturan' : undefined}
        >
          <Settings className="w-4 h-4 min-w-[16px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Pengaturan</span>}
        </Link>
      </nav>

      {/* Footer Info */}
      {sidebarOpen && (
        <div className="p-4 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
          <p className="font-semibold text-[var(--text-primary)]">Amanah Drive Console</p>
          <p>Palembang, Sumatera Selatan</p>
        </div>
      )}
    </aside>
  );
}
