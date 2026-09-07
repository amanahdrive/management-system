'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Database,
  Settings,
  ShieldCheck,
  X,
  AlertOctagon,
  IdCard,
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Sparkles,
  CreditCard,
  Landmark,
  Package,
  Tag,
  Users,
  Car,
  Clock,
  GraduationCap,
  Calendar,
  Award,
  Receipt,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';

const SISWA_SUB_ITEMS = [
  { label: 'Data Siswa', href: '/siswa', icon: Users },
  { label: 'Jadwal Sesi', href: '/jadwal', icon: Calendar },
  { label: 'Manajemen SIM', href: '/sim', icon: IdCard },
  { label: 'Sertifikat Siswa', href: '/sertifikat', icon: Award },
];

const KENDARAAN_SUB_ITEMS = [
  { label: 'Armada Kendaraan', href: '/kendaraan', icon: Car },
  { label: 'Data Insiden', href: '/insiden', icon: AlertOctagon },
];

const KAS_SUB_ITEMS = [
  { label: 'Overview Kas', href: '/kas', icon: Wallet },
  { label: 'Buku Besar (Cashflow)', href: '/kas/cashflow', icon: FileSpreadsheet },
  { label: 'Pos Pengeluaran', href: '/kas/pos', icon: Sparkles },
  { label: 'Manajemen Piutang', href: '/kas/piutang', icon: CreditCard },
  { label: 'Manajemen Hutang', href: '/kas/hutang', icon: Landmark },
  { label: 'Cetak Nota', href: '/nota', icon: Receipt },
];

const MASTER_SUB_ITEMS = [
  { label: 'Paket Kursus', href: '/master-data/paket', icon: Package },
  { label: 'Promosi Campaign', href: '/master-data/promosi', icon: Tag },
  { label: 'Staff & Instruktur', href: '/master-data/staff', icon: Users },
  { label: 'Daftar Jabatan', href: '/master-data/jabatan', icon: ShieldCheck },
  { label: 'Master Kendaraan', href: '/master-data/kendaraan', icon: Car },
  { label: 'Status Pembayaran', href: '/master-data/status-pembayaran', icon: CreditCard },
  { label: 'Slot Waktu', href: '/master-data/slot-waktu', icon: Clock },
];

const PWA_SUB_ITEMS = [
  { label: 'Portal Instruktur', href: '/instruktur', icon: ShieldCheck },
  { label: 'PWA Finance', href: '/finance', icon: Wallet },
];

export function MobileDrawer() {
  const pathname = usePathname();
  const { mobileDrawerOpen, setMobileDrawerOpen } = useUiStore();

  const isSiswaActive =
    pathname.startsWith('/siswa') ||
    pathname.startsWith('/sim') ||
    pathname.startsWith('/sertifikat') ||
    pathname.startsWith('/jadwal');
  const [siswaExpanded, setSiswaExpanded] = React.useState(isSiswaActive);

  const isKendaraanActive =
    pathname.startsWith('/kendaraan') || pathname.startsWith('/insiden');
  const [kendaraanExpanded, setKendaraanExpanded] = React.useState(isKendaraanActive);

  const isKasActive = pathname.startsWith('/kas') || pathname.startsWith('/nota');
  const [kasExpanded, setKasExpanded] = React.useState(isKasActive);

  const isMasterActive = pathname.startsWith('/master-data');
  const [masterExpanded, setMasterExpanded] = React.useState(isMasterActive);

  const isPwaActive = pathname.startsWith('/instruktur') || pathname.startsWith('/finance');
  const [pwaExpanded, setPwaExpanded] = React.useState(isPwaActive);

  React.useEffect(() => {
    if (isSiswaActive) setSiswaExpanded(true);
  }, [isSiswaActive]);

  React.useEffect(() => {
    if (isKendaraanActive) setKendaraanExpanded(true);
  }, [isKendaraanActive]);

  React.useEffect(() => {
    if (isKasActive) setKasExpanded(true);
  }, [isKasActive]);

  React.useEffect(() => {
    if (isMasterActive) setMasterExpanded(true);
  }, [isMasterActive]);

  React.useEffect(() => {
    if (isPwaActive) setPwaExpanded(true);
  }, [isPwaActive]);

  React.useEffect(() => {
    if (!mobileDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen, setMobileDrawerOpen]);

  if (!mobileDrawerOpen) return null;

  return (
    <div
      className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={() => setMobileDrawerOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Menu Navigasi Mobile"
    >
      <div
        className="w-4/5 max-w-xs bg-[var(--bg)] h-full p-4 flex flex-col justify-between animate-in slide-in-from-right duration-250 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
            <h3 className="font-bold text-base text-[var(--text-primary)]">Menu Navigasi</h3>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Tutup Menu Navigasi"
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          <div className="space-y-1">
            {/* 1. Dashboard */}
            <Link
              href="/dashboard"
              onClick={() => setMobileDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-[var(--brand-primary)] text-white font-semibold'
                  : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            {/* 2. Analitik */}
            <Link
              href="/analitik"
              onClick={() => setMobileDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                pathname.startsWith('/analitik')
                  ? 'bg-[var(--brand-primary)] text-white font-semibold'
                  : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Pusat Analitik & Laporan</span>
            </Link>

            {/* 3. Manajemen Siswa Dropdown */}
            <div>
              <button
                type="button"
                onClick={() => setSiswaExpanded((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  isSiswaActive
                    ? 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                    : 'text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4" />
                  <span>Manajemen Siswa</span>
                </div>
                {siswaExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {siswaExpanded && (
                <div className="pl-6 pt-1 space-y-1 border-l-2 border-[var(--border)] ml-4 my-1">
                  {SISWA_SUB_ITEMS.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);

                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                          isSubActive
                            ? 'bg-[var(--brand-primary)] text-white font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
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

            {/* 4. Kendaraan Dropdown */}
            <div>
              <button
                type="button"
                onClick={() => setKendaraanExpanded((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  isKendaraanActive
                    ? 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                    : 'text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Car className="w-4 h-4" />
                  <span>Kendaraan</span>
                </div>
                {kendaraanExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {kendaraanExpanded && (
                <div className="pl-6 pt-1 space-y-1 border-l-2 border-[var(--border)] ml-4 my-1">
                  {KENDARAAN_SUB_ITEMS.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);

                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                          isSubActive
                            ? 'bg-[var(--brand-primary)] text-white font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
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

            {/* 5. Kas & Keuangan Dropdown */}
            <div>
              <button
                type="button"
                onClick={() => setKasExpanded((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  isKasActive
                    ? 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                    : 'text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-4 h-4" />
                  <span>Kas & Keuangan</span>
                </div>
                {kasExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {kasExpanded && (
                <div className="pl-6 pt-1 space-y-1 border-l-2 border-[var(--border)] ml-4 my-1">
                  {KAS_SUB_ITEMS.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = pathname === sub.href;

                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                          isSubActive
                            ? 'bg-[var(--brand-primary)] text-white font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
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

            {/* 6. Master Data Dropdown */}
            <div>
              <button
                type="button"
                onClick={() => setMasterExpanded((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  isMasterActive
                    ? 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                    : 'text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4" />
                  <span>Master Data</span>
                </div>
                {masterExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {masterExpanded && (
                <div className="pl-6 pt-1 space-y-1 border-l-2 border-[var(--border)] ml-4 my-1">
                  {MASTER_SUB_ITEMS.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = pathname === sub.href;

                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                          isSubActive
                            ? 'bg-[var(--brand-primary)] text-white font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
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

            {/* 7. PWA Portals Dropdown (Isolated Browsing Context) */}
            <div>
              <button
                type="button"
                onClick={() => setPwaExpanded((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  isPwaActive
                    ? 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                    : 'text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4" />
                  <span>Portal PWA</span>
                </div>
                {pwaExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {pwaExpanded && (
                <div className="pl-6 pt-1 space-y-1 border-l-2 border-[var(--border)] ml-4 my-1">
                  {PWA_SUB_ITEMS.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = pathname === sub.href;

                    return (
                      <a
                        key={sub.href}
                        href={sub.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors ${
                          isSubActive
                            ? 'bg-[var(--brand-primary)] text-white font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                        title={`${sub.label} (Buka di window PWA mandiri)`}
                      >
                        <div className="flex items-center gap-2.5">
                          <SubIcon className="w-3.5 h-3.5" />
                          <span>{sub.label}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[var(--brand-primary)] font-bold font-mono">
                          <span>PWA</span>
                          <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 8. Pengaturan */}
            <Link
              href="/settings"
              onClick={() => setMobileDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                pathname.startsWith('/settings')
                  ? 'bg-[var(--brand-primary)] text-white font-semibold'
                  : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan Sistem</span>
            </Link>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)] text-[10px] text-[var(--text-secondary)] mt-6">
          <p className="font-semibold text-[var(--text-primary)]">Amanah Drive Mobile</p>
          <p>Admin Internal Tool v1.0</p>
        </div>
      </div>
    </div>
  );
}
