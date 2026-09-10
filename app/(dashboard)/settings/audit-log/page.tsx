'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Search,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  LogOut,
  FileText,
  ArrowRight,
  Clock,
  Users,
  Wallet,
  Car,
  Sparkles,
  Tag,
  Award,
  Check,
  X,
  Database,
  Terminal,
  Activity,
  User,
  SlidersHorizontal,
  ExternalLink,
  Laptop,
  Cpu,
  UserCheck,
  Bot,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  loginDeveloperAction,
  getDeveloperSession,
  logoutDeveloperAction,
  DeveloperUser,
} from '@/lib/actions/auth-dev';
import {
  getAuditLogsList,
  getAuditLogMetrics,
  getDeveloperAuthLogs,
  AuditLogItem,
  AuditMetrics,
  AuditLogFilter,
  AuditLogChangeItem,
} from '@/lib/actions/audit-log';

// Modul options for System Data Changes (Auth is kept separate in Developer Session Pill)
const MODUL_OPTIONS = [
  { value: 'all', label: 'Semua Modul Sistem' },
  { value: 'siswa', label: 'Kesiswaan (Siswa)' },
  { value: 'keuangan', label: 'Keuangan & Kas' },
  { value: 'jadwal', label: 'Jadwal Mengemudi' },
  { value: 'kendaraan', label: 'Armada Kendaraan' },
  { value: 'sim', label: 'Pelatihan SIM' },
  { value: 'sertifikat', label: 'Sertifikat Siswa' },
  { value: 'master_data', label: 'Master Data' },
  { value: 'settings', label: 'Pengaturan Sistem' },
];

// Aksi options
const AKSI_OPTIONS = [
  { value: 'all', label: 'Semua Aksi' },
  { value: 'create', label: 'Tambah Data (Create)' },
  { value: 'update', label: 'Pembaruan Data (Update)' },
  { value: 'status_change', label: 'Perubahan Status' },
  { value: 'payment', label: 'Transaksi Pembayaran' },
  { value: 'reschedule', label: 'Pergeseran Jadwal' },
  { value: 'delete', label: 'Penghapusan (Delete)' },
  { value: 'reset', label: 'Reset Data' },
];

// Date presets
const PERIOD_PRESETS = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'yesterday', label: 'Kemarin' },
  { value: '7days', label: '7 Hari' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'year', label: 'Tahun Ini' },
  { value: 'all', label: 'Semua Waktu' },
  { value: 'custom', label: 'Kustom' },
];

export default function AuditLogPage() {
  // --- Auth State ---
  const [sessionChecking, setSessionChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<DeveloperUser | null>(null);

  // Login Form State (Zero Autofill per user request)
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // --- Audit Log Data State ---
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Metrics State
  const [metrics, setMetrics] = useState<AuditMetrics>({
    totalLogs: 0,
    todayLogs: 0,
    criticalCount: 0,
    warningCount: 0,
    topModule: { name: '-', count: 0 },
    isImmutableProtected: true,
  });

  // Filter States
  const [modulFilter, setModulFilter] = useState('all');
  const [aksiFilter, setAksiFilter] = useState('all');
  const [sumberFilter, setSumberFilter] = useState<'all' | 'system' | 'manual'>('all');
  const [urgensiFilter, setUrgensiFilter] = useState('all');
  const [periodPreset, setPeriodPreset] = useState<'today' | 'yesterday' | '7days' | 'month' | 'year' | 'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Modals State
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);

  // Developer Auth History Modal State
  const [showAuthHistoryModal, setShowAuthHistoryModal] = useState(false);
  const [authLogs, setAuthLogs] = useState<AuditLogItem[]>([]);
  const [loadingAuthLogs, setLoadingAuthLogs] = useState(false);

  // Dynamic Greeting based on local time (WIB)
  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  // Check developer session on load
  const checkSession = useCallback(async () => {
    setSessionChecking(true);
    try {
      const res = await getDeveloperSession();
      if (res.isAuthenticated && res.user) {
        setCurrentUser(res.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setSessionChecking(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Load system logs and metrics when authenticated
  const fetchAuditData = useCallback(async () => {
    if (!currentUser) return;
    setLoadingLogs(true);
    try {
      const filter: AuditLogFilter = {
        modul: modulFilter,
        aksi: aksiFilter,
        sumber: sumberFilter,
        tingkatUrgensi: urgensiFilter,
        period: periodPreset,
        startDate: periodPreset === 'custom' ? startDate : undefined,
        endDate: periodPreset === 'custom' ? endDate : undefined,
        search: activeSearch,
        page,
        limit,
      };

      const [logRes, metricRes] = await Promise.all([
        getAuditLogsList(filter),
        getAuditLogMetrics(),
      ]);

      setLogs(logRes.logs);
      setTotalCount(logRes.totalCount);
      setTotalPages(logRes.totalPages);
      setMetrics(metricRes);
    } catch (err) {
      console.error('Error loading audit data:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [currentUser, modulFilter, aksiFilter, sumberFilter, urgensiFilter, periodPreset, startDate, endDate, activeSearch, page, limit]);

  useEffect(() => {
    if (currentUser) {
      fetchAuditData();
    }
  }, [currentUser, fetchAuditData]);

  // Fetch Developer Auth Login History
  const handleOpenAuthHistory = async () => {
    setShowAuthHistoryModal(true);
    setLoadingAuthLogs(true);
    try {
      const data = await getDeveloperAuthLogs(50);
      setAuthLogs(data);
    } catch (err) {
      console.error('Error fetching developer auth logs:', err);
    } finally {
      setLoadingAuthLogs(false);
    }
  };

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await loginDeveloperAction({
        username: usernameInput,
        password: passwordInput,
      });

      if (res.success && res.user) {
        setCurrentUser(res.user);
        setPasswordInput('');
      } else {
        setLoginError(res.error || 'Autentikasi gagal. Periksa kredensial Anda.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logoutDeveloperAction();
    setCurrentUser(null);
    setLogs([]);
  };

  // Handle Search Trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchQuery);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setModulFilter('all');
    setAksiFilter('all');
    setSumberFilter('all');
    setUrgensiFilter('all');
    setPeriodPreset('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setActiveSearch('');
    setPage(1);
  };

  // Humanize Timestamp to WIB
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return (
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(date) + ' WIB'
      );
    } catch {
      return isoString;
    }
  };

  // Relative Time in Indonesian
  const getRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Baru saja';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} hari lalu`;
      return formatTimestamp(isoString).split(',')[0];
    } catch {
      return '';
    }
  };

  // Render Badge Colors
  const getModulBadge = (modul: string) => {
    const map: Record<string, { label: string; color: string; icon: any }> = {
      siswa: { label: 'Kesiswaan', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800', icon: Users },
      keuangan: { label: 'Keuangan', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800', icon: Wallet },
      jadwal: { label: 'Jadwal', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800', icon: Calendar },
      kendaraan: { label: 'Armada', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800', icon: Car },
      sim: { label: 'SIM', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800', icon: Tag },
      sertifikat: { label: 'Sertifikat', color: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-300 dark:border-violet-800', icon: Award },
      master_data: { label: 'Master Data', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300 border-slate-300 dark:border-slate-700', icon: Database },
      settings: { label: 'Pengaturan', color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700', icon: SlidersHorizontal },
      auth: { label: 'Sesi Developer', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800', icon: Shield },
    };
    const info = map[modul] || { label: modul, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300', icon: Activity };
    const IconComponent = info.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${info.color}`}>
        <IconComponent className="w-3 h-3" />
        <span>{info.label}</span>
      </span>
    );
  };

  const getAksiBadge = (aksi: string) => {
    const map: Record<string, { label: string; color: string }> = {
      create: { label: 'Tambah', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
      update: { label: 'Pembaruan', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
      status_change: { label: 'Ubah Status', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
      payment: { label: 'Pembayaran', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
      reschedule: { label: 'Reschedule', color: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
      delete: { label: 'Hapus', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
      login: { label: 'Login Sesi', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' },
      logout: { label: 'Logout Sesi', color: 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-800' },
      reset: { label: 'Reset Sistem', color: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800' },
    };
    const info = map[aksi] || { label: aksi, color: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200' };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${info.color}`}>
        {info.label}
      </span>
    );
  };

  // Helper to distinguish Automated System from Manual Operator
  const isSystemAutomated = (actorUsername: string, actorRole: string) => {
    const lowerName = (actorUsername || '').toLowerCase();
    const lowerRole = (actorRole || '').toLowerCase();
    return (
      lowerRole === 'system' ||
      lowerName.includes('system') ||
      lowerName.includes('sistem') ||
      lowerName.includes('trigger') ||
      lowerName.includes('cron') ||
      lowerName.includes('bot') ||
      lowerName.includes('otomatis')
    );
  };

  const getExecutionBadge = (actorUsername: string, actorRole: string) => {
    const isAuto = isSystemAutomated(actorUsername, actorRole);
    if (isAuto) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 shadow-2xs">
          <Cpu className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
          <span>Otomatis Sistem</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
        <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span>Perubahan Manual</span>
      </span>
    );
  };

  // --- RENDERING ---

  // 1. Session Loading Screen
  if (sessionChecking) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            Memverifikasi Sesi Akses Developer...
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Developer Login Gatekeeper
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-12 px-4 space-y-6">
        <PageHeader
          title="Audit Log Sistem"
          description="Akses Terbatas: Autentikasi Pengembang & Audit Trail"
          breadcrumbs={[{ label: 'Pengaturan', href: '/settings' }, { label: 'Audit Log' }]}
        />

        <div className="bg-white dark:bg-[#0E131F] border border-[var(--border)] rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Developer Security Checkpoint
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs">
              Masukkan kredensial Developer untuk membuka rekaman histori data & audit trail sistem Amanah Drive.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-[var(--text-secondary)] font-semibold mb-1.5">
                Username / Email Developer
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="off"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[var(--brand-primary)] outline-none"
                />
                <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] font-semibold mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan password developer"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[var(--brand-primary)] outline-none"
                />
                <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Sesi...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Masuk ke Audit Log</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Authenticated: Enterprise SaaS Audit Log Dashboard
  const greeting = getGreetingText();

  return (
    <div className="space-y-6">
      {/* Top Header with Developer Greeting Pill & Logout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <Link href="/settings" className="hover:underline">Pengaturan</Link>
            <span>/</span>
            <span className="text-[var(--brand-primary)] font-medium">Audit Log</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-[var(--brand-primary)]" />
              Sistem Audit Log Enterprise
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <Lock className="w-3 h-3" />
              Immutable WORM Ledger
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Rekaman aktivitas & histori perubahan data sistem (terpisah dari riwayat sesi developer).
          </p>
        </div>

        {/* Developer Session Pill (Clickable -> Opens Developer Login History) & Logout Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleOpenAuthHistory}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-white dark:bg-[#0E131F] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 rounded-xl text-xs shadow-xs transition-all group text-left"
            title="Klik untuk membuka Riwayat Sesi & Login Developer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center gap-1">
                <span>{greeting}, {currentUser.nama || 'Alfi'}</span>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)] opacity-60 group-hover:opacity-100 transition-opacity" />
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Riwayat Sesi Login</span>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-2 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Keluar Sesi Developer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar Sesi</span>
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards (Opaque solid backgrounds) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-[#0E131F] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between border-l-4 border-l-blue-500 shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-semibold">Total Log Sistem</span>
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[var(--text-primary)]">
              {metrics.totalLogs.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Riwayat perubahan sistem</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-[#0E131F] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between border-l-4 border-l-emerald-500 shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-semibold">Perubahan Hari Ini</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {metrics.todayLogs.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Tercatat pada zona WIB</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-[#0E131F] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between border-l-4 border-l-purple-500 shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-semibold">Modul Teraktif</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-[var(--text-primary)] capitalize truncate">
              {metrics.topModule.name}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {metrics.topModule.count.toLocaleString('id-ID')} pembaruan data
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-[#0E131F] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between border-l-4 border-l-amber-500 shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-semibold">Integritas Ledger</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>100% Tamper-Proof</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Anti-Delete & Anti-Update aktif
            </p>
          </div>
        </div>
      </div>

      {/* Control & Filter Toolbar (Opaque Solid) */}
      <div className="bg-white dark:bg-[#0E131F] border border-[var(--border)] rounded-xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari deskripsi, aktor, ID entitas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveSearch('');
                }}
                className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={fetchAuditData}
              disabled={loadingLogs}
              className="px-3 py-2 border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-xs text-[var(--text-secondary)] font-medium transition-colors"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Dropdowns & Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Modul Filter */}
          <div>
            <label className="block text-[var(--text-muted)] font-semibold mb-1">Modul Sistem</label>
            <select
              value={modulFilter}
              onChange={(e) => {
                setModulFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium outline-none"
            >
              {MODUL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Aksi Filter */}
          <div>
            <label className="block text-[var(--text-muted)] font-semibold mb-1">Jenis Aksi</label>
            <select
              value={aksiFilter}
              onChange={(e) => {
                setAksiFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium outline-none"
            >
              {AKSI_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tipe Eksekusi Filter (Otomatis Sistem vs Manual Operator) */}
          <div>
            <label className="block text-[var(--text-muted)] font-semibold mb-1">Tipe Eksekusi</label>
            <select
              value={sumberFilter}
              onChange={(e) => {
                setSumberFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium outline-none"
            >
              <option value="all">Semua Tipe Eksekusi</option>
              <option value="system">⚡ Otomatis Sistem</option>
              <option value="manual">👤 Perubahan Manual</option>
            </select>
          </div>

          {/* Urgensi Filter */}
          <div>
            <label className="block text-[var(--text-muted)] font-semibold mb-1">Tingkat Urgensi</label>
            <select
              value={urgensiFilter}
              onChange={(e) => {
                setUrgensiFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium outline-none"
            >
              <option value="all">Semua Urgensi</option>
              <option value="info">Info / Normal</option>
              <option value="warning">Peringatan (Warning)</option>
              <option value="critical">Kritis (Critical)</option>
            </select>
          </div>

          {/* Limit per page */}
          <div>
            <label className="block text-[var(--text-muted)] font-semibold mb-1">Baris Per Halaman</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium outline-none"
            >
              <option value={15}>15 baris</option>
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
            </select>
          </div>
        </div>

        {/* Date Filter Presets */}
        <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-muted)] mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Periode:
          </span>
          {PERIOD_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setPeriodPreset(p.value as any);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                periodPreset === p.value
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p.label}
            </button>
          ))}

          {/* Custom Date Range Picker Inputs */}
          {periodPreset === 'custom' && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-auto text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                placeholder="Mulai"
              />
              <span className="text-[var(--text-muted)]">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                placeholder="Sampai"
              />
            </div>
          )}
        </div>
      </div>

      {/* Audit Log Table / Feed (Opaque Solid) */}
      <div className="bg-white dark:bg-[#0E131F] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--brand-primary)]" />
            <h3 className="font-bold text-xs text-[var(--text-primary)]">
              Riwayat Perubahan Data Sistem
            </h3>
            <span className="text-[11px] text-[var(--text-muted)]">
              ({totalCount} aktivitas sistem)
            </span>
          </div>
          {loadingLogs && (
            <span className="text-xs text-[var(--brand-primary)] flex items-center gap-1.5 font-medium animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Memuat...</span>
            </span>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Tidak Ada Rekaman Perubahan Data Ditemukan
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Tidak ada perubahan data sistem yang cocok dengan kriteria filter yang Anda terapkan.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-2 px-3 py-1.5 text-xs font-semibold bg-[var(--brand-primary)] text-white rounded-md hover:bg-[var(--brand-primary-dark)] transition-colors"
            >
              Reset Filter Pencarian
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] font-semibold bg-slate-50/50 dark:bg-slate-900/40">
                  <th className="py-2.5 px-4">Waktu (WIB)</th>
                  <th className="py-2.5 px-3">Aktor</th>
                  <th className="py-2.5 px-3">Modul & Aksi</th>
                  <th className="py-2.5 px-4">Aktivitas & Perubahan</th>
                  <th className="py-2.5 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {logs.map((log) => {
                  const hasDiff =
                    (Array.isArray(log.perubahan) && log.perubahan.length > 0) ||
                    (log.perubahan && typeof log.perubahan === 'object' && Object.keys(log.perubahan).length > 0);

                  const diffCount = Array.isArray(log.perubahan) ? log.perubahan.length : 0;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {formatTimestamp(log.created_at)}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {getRelativeTime(log.created_at)}
                        </div>
                      </td>

                      {/* Actor & Execution Source */}
                      <td className="py-3 px-3 whitespace-nowrap space-y-1">
                        <div>{getExecutionBadge(log.actor_username, log.actor_role)}</div>
                        <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] font-medium">
                          <User className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                          <span className="truncate max-w-[130px]" title={log.actor_username}>{log.actor_username}</span>
                        </div>
                      </td>

                      {/* Modul & Aksi */}
                      <td className="py-3 px-3 whitespace-nowrap space-y-1">
                        <div>{getModulBadge(log.modul)}</div>
                        <div>{getAksiBadge(log.aksi)}</div>
                      </td>

                      {/* Activity Title & Humanized Description */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[var(--text-primary)]">
                          {log.judul}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                          {log.deskripsi}
                        </div>
                        {diffCount > 0 && (
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--brand-primary)] font-semibold">
                            <Sparkles className="w-3 h-3" />
                            <span>{diffCount} parameter diubah</span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {hasDiff || log.data_sebelum || log.data_sesudah ? (
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setShowMetadata(false);
                            }}
                            className="px-2.5 py-1.5 border border-[var(--border)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] rounded-md font-semibold text-[11px] transition-colors inline-flex items-center gap-1 bg-white dark:bg-[#0E131F]"
                          >
                            <span>Detail Diff</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-900/30">
            <span className="text-[var(--text-muted)]">
              Menampilkan {(page - 1) * limit + 1} -{' '}
              {Math.min(page * limit, totalCount)} dari {totalCount} log
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-md border border-[var(--border)] disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-[var(--text-primary)]">
                Halaman {page} dari {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md border border-[var(--border)] disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Detail Perubahan Diff (Solid Opaque Container) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#0E131F] border border-[var(--border)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getModulBadge(selectedLog.modul)}
                  {getAksiBadge(selectedLog.aksi)}
                  {getExecutionBadge(selectedLog.actor_username, selectedLog.actor_role)}
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">
                    ID: {selectedLog.id.slice(0, 8)}...
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  {selectedLog.judul}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Summary Description */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-[var(--border)] text-[var(--text-secondary)]">
                <div className="font-semibold text-[var(--text-primary)] mb-0.5">Deskripsi Perubahan:</div>
                <p>{selectedLog.deskripsi}</p>
                <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-muted)]">
                  <span>Waktu: <strong className="text-[var(--text-primary)]">{formatTimestamp(selectedLog.created_at)}</strong></span>
                  <span>Tipe: <strong className={isSystemAutomated(selectedLog.actor_username, selectedLog.actor_role) ? 'text-cyan-700 dark:text-cyan-400 font-bold' : 'text-emerald-700 dark:text-emerald-400 font-bold'}>
                    {isSystemAutomated(selectedLog.actor_username, selectedLog.actor_role) ? '⚡ Otomatis Sistem (Trigger DB)' : '👤 Perubahan Manual'}
                  </strong></span>
                  <span>Aktor: <strong className="text-[var(--text-primary)]">{selectedLog.actor_username}</strong></span>
                  {selectedLog.entitas_id && (
                    <span>Entitas: <strong className="text-[var(--text-primary)]">{selectedLog.entitas_tipe} #{selectedLog.entitas_id.slice(0, 8)}</strong></span>
                  )}
                </div>
              </div>

              {/* Diff Viewer (Parsed Humanized vs Object) */}
              <div>
                <h4 className="font-bold text-xs text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
                  Rincian Parameter yang Diubah
                </h4>

                {Array.isArray(selectedLog.perubahan) && selectedLog.perubahan.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedLog.perubahan.map((diff: AuditLogChangeItem, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[var(--text-primary)]">
                            {diff.label || diff.kolom}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            kolom: {diff.kolom}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
                            <span className="block text-[10px] font-semibold text-rose-600 dark:text-rose-400 mb-0.5">
                              Sebelumnya:
                            </span>
                            <span className="font-mono break-all">{diff.sebelum || '-'}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
                            <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
                              Sesudah:
                            </span>
                            <span className="font-mono break-all">{diff.sesudah || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedLog.perubahan && typeof selectedLog.perubahan === 'object' ? (
                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-[var(--border)] font-mono text-[11px] overflow-x-auto">
                    <pre>{JSON.stringify(selectedLog.perubahan, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)] text-[var(--text-muted)] text-center">
                    Tidak ada diff delta khusus yang tercatat untuk aktivitas ini.
                  </div>
                )}
              </div>

              {/* Toggle Metadata Drawer */}
              <div className="pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowMetadata(!showMetadata)}
                  className="text-xs font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{showMetadata ? 'Sembunyikan Metadata Teknis' : 'Tampilkan Metadata Teknis (IP & User Agent)'}</span>
                </button>

                {showMetadata && (
                  <div className="mt-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-[var(--border)] space-y-1.5 font-mono text-[10px] text-[var(--text-secondary)]">
                    <div><strong>Log ID:</strong> {selectedLog.id}</div>
                    <div><strong>IP Address:</strong> {selectedLog.ip_address || '127.0.0.1 (Local / Proxy)'}</div>
                    <div><strong>User Agent:</strong> {selectedLog.user_agent || 'Unknown'}</div>
                    <div><strong>Entitas ID:</strong> {selectedLog.entitas_id || '-'}</div>
                    <div><strong>Tipe Entitas:</strong> {selectedLog.entitas_tipe}</div>
                    <div><strong>Immutability Status:</strong> VERIFIED_WORM_APPEND_ONLY</div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>Append-Only Ledger (Non-Modifiable)</span>
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Riwayat Sesi & Login Developer (Alfi) */}
      {showAuthHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#0E131F] border border-[var(--border)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <span>Riwayat Sesi & Login Developer: Alfi</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Developer
                    </span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Catatan autentikasi sesi pengembang, alamat IP, dan aktivitas keluar/masuk.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthHistoryModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              {loadingAuthLogs ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-[var(--text-muted)]">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                  <span>Memuat riwayat sesi developer...</span>
                </div>
              ) : authLogs.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-muted)]">
                  Belum ada rekaman sesi login tambahan.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {authLogs.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-[var(--border)] bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.aksi === 'login'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200'
                            }`}
                          >
                            {item.aksi === 'login' ? 'Login Sesi' : 'Logout Sesi'}
                          </span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {item.judul}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span>IP: <strong>{item.ip_address || '127.0.0.1'}</strong></span>
                          {item.user_agent && (
                            <span className="truncate max-w-xs" title={item.user_agent}>
                              Browser: {item.user_agent.slice(0, 45)}...
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right sm:self-center shrink-0">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {formatTimestamp(item.created_at)}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {getRelativeTime(item.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Sesi aktif 30 hari dengan auto-renew (sliding expiration).</span>
              </span>
              <button
                onClick={() => setShowAuthHistoryModal(false)}
                className="px-4 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
