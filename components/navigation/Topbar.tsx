'use client';

import React from 'react';
import Image from 'next/image';
import { ThemeToggle } from '../shared/ThemeToggle';
import { useUiStore } from '@/lib/store/ui-store';
import { RefreshCw, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Topbar() {
  const { sidebarOpen } = useUiStore();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<string>('');
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setLastSyncTime(`${h}:${m}:${s} WIB`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshDatabase = async () => {
    setIsRefreshing(true);
    router.refresh();
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    setLastSyncTime(`${h}:${m}:${s} WIB`);

    setTimeout(() => {
      setIsRefreshing(false);
      setToastMessage('Database berhasil disinkronkan & diperbarui!');
      setTimeout(() => setToastMessage(null), 3000);
    }, 600);
  };

  return (
    <header
      className={`h-16 fixed top-0 right-0 z-30 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 transition-all duration-300 left-0 ${
        sidebarOpen ? 'md:left-64' : 'md:left-20'
      }`}
    >
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-full shadow-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left: Mobile Brand & Database Sync Status */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex items-center gap-2">
          <Image
            src="/assets/logo-amdri-symbol.png"
            alt="Logo"
            width={28}
            height={28}
            className="object-contain"
          />
          <span className="font-brand font-bold text-base text-[var(--brand-primary)]">Amanah Drive</span>
        </div>

        {/* Live Database Sync Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] text-[11px]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span className="eyebrow-label text-[10px] text-[var(--text-primary)]">Live Sync</span>
          <span className="text-[var(--text-muted)] font-mono tabular-num text-[10px]">
            • {lastSyncTime ? `${lastSyncTime}` : 'Terhubung'}
          </span>
        </div>
      </div>

      {/* Right: Refresh DB, Theme Toggle & Admin Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Button Refresh Database */}
        <button
          onClick={handleRefreshDatabase}
          disabled={isRefreshing}
          aria-label="Refresh Data dan Sinkronisasi Database"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-all shadow-xs"
          title="Refresh Data & Sinkronisasi Database"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[var(--brand-primary)] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh Sync</span>
        </button>

        <ThemeToggle />

        <div className="flex items-center gap-2.5 pl-2.5 border-l border-[var(--border)]">
          <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-extrabold flex items-center justify-center shadow-xs">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-[var(--text-primary)]">Admin Staff</div>
            <div className="text-[10px] text-[var(--text-muted)] font-medium">Palembang Operations</div>
          </div>
        </div>
      </div>
    </header>
  );
}
