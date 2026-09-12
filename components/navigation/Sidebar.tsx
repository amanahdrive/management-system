'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  IdCard,
  Calendar,
  Car,
  Wallet,
  Database,
  Settings,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Package,
  Tag,
  ShieldCheck,
  CreditCard,
  Clock,
  AlertOctagon,
  Receipt,
  Award,
  FileSpreadsheet,
  Sparkles,
  Landmark,
  Building2,
  GraduationCap,
  Smartphone,
  ExternalLink,
  Globe,
  Inbox,
  ArrowLeft,
} from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';
import { checkIsFinanceMode, clearFinanceMode } from '@/lib/utils/finance-mode';

const HOMEPAGE_SUB_ITEMS = [
  { label: 'Internal Tracking', href: '/homepage-manager/tracking', icon: BarChart3 },
  { label: 'Form Submit', href: '/homepage-manager/submissions', icon: Inbox },
  { label: 'Homepage Updater', href: '/homepage-manager/information', icon: Globe },
];

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
  { label: 'Rekening Bank', href: '/kas/rekening', icon: Building2 },
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
  { label: 'Portal Instruktur', href: '/instruktur', icon: ShieldCheck, badge: 'PWA' },
  { label: 'PWA Finance', href: '/finance', icon: Wallet, badge: 'PWA' },
];

const SETTINGS_SUB_ITEMS = [
  { label: 'Pengaturan Sistem', href: '/settings', icon: Settings },
  { label: 'Audit Log', href: '/settings/audit-log', icon: ShieldCheck, badge: 'Dev' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUiStore();

  const isHomepageActive = pathname.startsWith('/homepage-manager');
  const [homepageExpanded, setHomepageExpanded] = React.useState(isHomepageActive);

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

  const isSettingsActive = pathname.startsWith('/settings');
  const [settingsExpanded, setSettingsExpanded] = React.useState(isSettingsActive);

  const [isFinanceMode, setIsFinanceMode] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateMode = () => {
      setIsFinanceMode(checkIsFinanceMode(pathname));
    };
    updateMode();

    const handleModeChange = () => updateMode();
    window.addEventListener('amanah:finance-mode-change', handleModeChange);
    return () => {
      window.removeEventListener('amanah:finance-mode-change', handleModeChange);
    };
  }, [pathname]);

  React.useEffect(() => {
    if (isHomepageActive) setHomepageExpanded(true);
  }, [isHomepageActive]);

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
    if (isSettingsActive) setSettingsExpanded(true);
  }, [isSettingsActive]);

  const handleHomepageClick = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setHomepageExpanded(true);
      return;
    }
    setHomepageExpanded((prev) => !prev);
  };

  const handleSiswaClick = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setSiswaExpanded(true);
      return;
    }
    setSiswaExpanded((prev) => !prev);
  };

  const handleKendaraanClick = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setKendaraanExpanded(true);
      return;
    }
    setKendaraanExpanded((prev) => !prev);
  };

  const handleKasClick = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setKasExpanded(true);
      return;
    }
    setKasExpanded((prev) => !prev);
  };

  const handleMasterClick = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setMasterExpanded(true);
      return;
    }
    setMasterExpanded((prev) => !prev);
  };

  const handlePwaClick = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setPwaExpanded(true);
      return;
    }
    setPwaExpanded((prev) => !prev);
  };

  const handleSettingsClick = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setSettingsExpanded(true);
      return;
    }
    setSettingsExpanded((prev) => !prev);
  };

  const navItemClass = (isActive: boolean) =>
    `group relative flex items-center ${
      sidebarOpen ? 'gap-3 px-3.5' : 'justify-center px-0'
    } py-2 text-xs font-medium transition-all rounded-xl border-l-2 ${
      isActive
        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold shadow-2xs'
        : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
    }`;

  const dropdownHeaderClass = (isActive: boolean) =>
    `w-full flex items-center ${
      sidebarOpen ? 'justify-between px-3.5' : 'justify-center px-0'
    } py-2.5 text-xs font-medium transition-colors border-l-2 ${
      isActive
        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
        : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
    }`;

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-[var(--liquid-glass-bg)] backdrop-blur-2xl border-r border-[var(--liquid-glass-border)] shadow-xs transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`h-16 flex items-center border-b border-[var(--liquid-glass-border)] ${
          sidebarOpen ? 'justify-between px-4' : 'justify-center px-2'
        }`}
      >
        {sidebarOpen ? (
          <>
            <Link href={isFinanceMode ? '/finance' : '/dashboard'} className="flex items-center gap-2.5 min-w-0">
              <Image
                src="/assets/logo-amdri-symbol.png"
                alt="Amanah Drive Symbol"
                width={32}
                height={32}
                className="object-contain shrink-0"
              />
              <span className="font-brand font-bold text-base text-[var(--brand-primary)] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                {isFinanceMode ? 'Amanah Finance' : 'Amanah Drive'}
              </span>
            </Link>
            <button
              onClick={toggleSidebar}
              aria-label="Ciutkan Sidebar"
              className="p-1.5 border border-[var(--liquid-glass-border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] rounded-xl transition-colors shrink-0"
              title="Ciutkan Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
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
        {isFinanceMode ? (
          <>
            {/* Tombol Kembali ke Admin Dashboard */}
            <div className="pb-2 mb-2 border-b border-[var(--liquid-glass-border)]">
              <button
                type="button"
                onClick={() => {
                  clearFinanceMode();
                  setIsFinanceMode(false);
                  router.push('/dashboard');
                }}
                className={`w-full flex items-center ${
                  sidebarOpen ? 'gap-2.5 px-3' : 'justify-center px-0'
                } py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl transition-all cursor-pointer shadow-2xs`}
                title="Kembali ke Dashboard Admin Utama"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="whitespace-nowrap">Dashboard Admin</span>}
              </button>
            </div>

            {/* 1. Portal Finance (Beranda) */}
            <Link
              href="/finance"
              className={navItemClass(pathname === '/finance')}
              title={!sidebarOpen ? 'Portal Finance' : undefined}
            >
              <Wallet className="w-4 h-4 min-w-[16px]" />
              {sidebarOpen && <span className="whitespace-nowrap font-bold">Portal Finance</span>}
            </Link>

            <div className="pt-3 pb-1 px-3">
              {sidebarOpen && (
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Kas & Keuangan
                </p>
              )}
            </div>

            {/* Submenu Kas & Keuangan */}
            {KAS_SUB_ITEMS.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = pathname === sub.href;
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={navItemClass(isSubActive)}
                  title={!sidebarOpen ? sub.label : undefined}
                >
                  <SubIcon className="w-4 h-4 min-w-[16px]" />
                  {sidebarOpen && <span className="whitespace-nowrap">{sub.label}</span>}
                </Link>
              );
            })}
          </>
        ) : (
          <>
            {/* 1. Dashboard */}
            <Link
              href="/dashboard"
              className={navItemClass(pathname === '/dashboard')}
              title={!sidebarOpen ? 'Dashboard' : undefined}
            >
              <LayoutDashboard className="w-4 h-4 min-w-[16px]" />
              {sidebarOpen && <span className="whitespace-nowrap">Dashboard</span>}
            </Link>

        {/* 2. Analitik */}
        <Link
          href="/analitik"
          className={navItemClass(pathname.startsWith('/analitik'))}
          title={!sidebarOpen ? 'Analitik' : undefined}
        >
          <BarChart3 className="w-4 h-4 min-w-[16px]" />
          {sidebarOpen && <span className="whitespace-nowrap">Analitik</span>}
        </Link>

        {/* 2b. Homepage Manager Dropdown */}
        <div>
          <button
            onClick={handleHomepageClick}
            className={dropdownHeaderClass(isHomepageActive)}
            title={!sidebarOpen ? 'Homepage Manager' : undefined}
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 min-w-[16px]" />
              {sidebarOpen && <span className="whitespace-nowrap font-medium">Homepage Manager</span>}
            </div>
            {sidebarOpen && (
              homepageExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {sidebarOpen && homepageExpanded && (
            <div className="pl-4 pt-1 space-y-1 border-l border-[var(--border)] ml-5 my-1.5">
              {HOMEPAGE_SUB_ITEMS.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = pathname === sub.href;

                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 text-xs font-normal transition-all rounded-lg border-l ${
                      isSubActive
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                        : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
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

        {/* 3. Manajemen Siswa Dropdown */}
        <div>
          <button
            onClick={handleSiswaClick}
            className={dropdownHeaderClass(isSiswaActive)}
            title={!sidebarOpen ? 'Manajemen Siswa' : undefined}
          >
            <div className="flex items-center gap-3">
              <GraduationCap className="w-4 h-4 min-w-[16px]" />
              {sidebarOpen && <span className="whitespace-nowrap">Manajemen Siswa</span>}
            </div>
            {sidebarOpen && (
              siswaExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {sidebarOpen && siswaExpanded && (
            <div className="pl-4 pt-1 space-y-1 border-l border-[var(--border)] ml-5 my-1.5">
              {SISWA_SUB_ITEMS.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);

                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 text-xs font-normal transition-all rounded-lg border-l ${
                      isSubActive
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                        : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
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
            onClick={handleKendaraanClick}
            className={dropdownHeaderClass(isKendaraanActive)}
            title={!sidebarOpen ? 'Kendaraan' : undefined}
          >
            <div className="flex items-center gap-3">
              <Car className="w-4 h-4 min-w-[16px]" />
              {sidebarOpen && <span className="whitespace-nowrap">Kendaraan</span>}
            </div>
            {sidebarOpen && (
              kendaraanExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {sidebarOpen && kendaraanExpanded && (
            <div className="pl-4 pt-1 space-y-1 border-l border-[var(--border)] ml-5 my-1.5">
              {KENDARAAN_SUB_ITEMS.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);

                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 text-xs font-normal transition-all rounded-lg border-l ${
                      isSubActive
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                        : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
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
            onClick={handleKasClick}
            className={dropdownHeaderClass(isKasActive)}
            title={!sidebarOpen ? 'Kas & Keuangan' : undefined}
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-4 h-4 min-w-[16px]" />
              {sidebarOpen && <span className="whitespace-nowrap">Kas & Keuangan</span>}
            </div>
            {sidebarOpen && (
              kasExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {sidebarOpen && kasExpanded && (
            <div className="pl-4 pt-1 space-y-1 border-l border-[var(--border)] ml-5 my-1.5">
              {KAS_SUB_ITEMS.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = pathname === sub.href;

                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 text-xs font-normal transition-all rounded-lg border-l ${
                      isSubActive
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                        : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
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
            onClick={handleMasterClick}
            className={dropdownHeaderClass(isMasterActive)}
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

          {sidebarOpen && masterExpanded && (
            <div className="pl-4 pt-1 space-y-1 border-l border-[var(--border)] ml-5 my-1.5">
              {MASTER_SUB_ITEMS.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = pathname === sub.href;

                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 text-xs font-normal transition-all rounded-lg border-l ${
                      isSubActive
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                        : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
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
            onClick={handlePwaClick}
            className={dropdownHeaderClass(isPwaActive)}
            title={!sidebarOpen ? 'Portal PWA' : undefined}
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 min-w-[16px]" />
              {sidebarOpen && <span className="whitespace-nowrap">Portal PWA</span>}
            </div>
            {sidebarOpen && (
              pwaExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {sidebarOpen && pwaExpanded && (
            <div className="pl-4 pt-1 space-y-1 border-l border-[var(--border)] ml-5 my-1.5">
              {PWA_SUB_ITEMS.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = pathname === sub.href;

                return (
                  <a
                    key={sub.href}
                    href={sub.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between px-3 py-1.5 text-xs font-normal transition-all rounded-lg border-l ${
                      isSubActive
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                        : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
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

        {/* 8. Pengaturan & Audit Log Dropdown */}
        <div>
          <button
            onClick={handleSettingsClick}
            className={dropdownHeaderClass(isSettingsActive)}
            title={!sidebarOpen ? 'Pengaturan' : undefined}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 min-w-[16px]" />
              {sidebarOpen && <span className="whitespace-nowrap">Pengaturan</span>}
            </div>
            {sidebarOpen && (
              settingsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {sidebarOpen && settingsExpanded && (
            <div className="pl-4 pt-1 space-y-1 border-l border-[var(--border)] ml-5 my-1.5">
              {SETTINGS_SUB_ITEMS.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = pathname === sub.href;

                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`flex items-center justify-between px-3 py-1.5 text-xs font-normal transition-all rounded-lg border-l ${
                      isSubActive
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                        : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <SubIcon className="w-3.5 h-3.5" />
                      <span>{sub.label}</span>
                    </div>
                    {sub.badge && (
                      <span className="text-[9px] px-1 py-0.2 rounded font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {sub.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
          </>
        )}
      </nav>

      {/* Footer Info */}
      {sidebarOpen && (
        <div className="p-4 border-t border-[var(--liquid-glass-border)] text-[11px] text-[var(--text-muted)]">
          <p className="font-semibold text-[var(--text-primary)]">
            {isFinanceMode ? 'Amanah Finance App' : 'Amanah Drive Console'}
          </p>
          <p>{isFinanceMode ? 'Modul Kas & Keuangan' : 'Palembang, Sumatera Selatan'}</p>
        </div>
      )}
    </aside>
  );
}
