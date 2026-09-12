'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '../shared/ThemeToggle';
import { useUiStore } from '@/lib/store/ui-store';
import { RefreshCw, Check, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { sound } from '@/lib/sound/SoundFX';
import { purgeServerCache } from '@/lib/actions/cache';
import { triggerAppRefresh } from '@/lib/utils/refresh-event';
import { checkIsFinanceMode, clearFinanceMode } from '@/lib/utils/finance-mode';

export function Topbar() {
  const { sidebarOpen } = useUiStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<string>('');
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);
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
    setIsMuted(sound.getMuted());
    const handleSoundChange = (e: any) => {
      setIsMuted(Boolean(e.detail?.muted));
    };
    window.addEventListener('amanah:sound:change', handleSoundChange);
    return () => window.removeEventListener('amanah:sound:change', handleSoundChange);
  }, []);

  const handleToggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      sound.playTactileClick();
    }
  };

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
    try {
      await purgeServerCache();
      router.refresh();
      triggerAppRefresh();

      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setLastSyncTime(`${h}:${m}:${s} WIB`);
      sound.playConfirmChime();

      setToastMessage('Database & data tampilan berhasil disinkronkan!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Error refreshing database:', err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  return (
    <header
      className={`h-14 fixed top-0 right-0 z-30 bg-[var(--liquid-glass-bg)] backdrop-blur-2xl border-b border-[var(--liquid-glass-border)] flex items-center justify-between px-4 md:px-6 transition-all duration-300 left-0 shadow-xs ${
        sidebarOpen ? 'md:left-64' : 'md:left-20'
      }`}
    >
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-800/90 backdrop-blur-md text-white text-xs font-mono border border-emerald-500/40 rounded-full shadow-2xl flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left: Mobile Brand & Database Sync Status */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex items-center gap-2">
          <Link href={isFinanceMode ? '/finance' : '/dashboard'} className="flex items-center gap-2">
            <Image
              src="/assets/logo-amdri-symbol.png"
              alt="Logo"
              width={24}
              height={24}
              className="object-contain"
            />
            <span className="font-brand font-bold text-sm text-[var(--brand-primary)]">
              {isFinanceMode ? 'Amanah Finance' : 'Amanah Drive'}
            </span>
          </Link>
        </div>

        {/* Live Database Sync Telemetry */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-[var(--liquid-glass-border)] rounded-full text-[10px] font-mono shadow-xs">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[var(--text-muted)] uppercase tracking-wider font-semibold">SYNC:</span>
          <span className="text-[var(--text-primary)] font-bold tabular-nums">
            {lastSyncTime ? `${lastSyncTime}` : 'ONLINE'}
          </span>
        </div>
      </div>

      {/* Right: Audio Toggle, Refresh DB, Theme Toggle & Admin Badge */}
      <div className="flex items-center gap-2">
        {/* Quick Return to Admin Button (When in Finance Mode) */}
        {isFinanceMode && (
          <button
            type="button"
            onClick={() => {
              clearFinanceMode();
              setIsFinanceMode(false);
              router.push('/dashboard');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
            title="Kembali ke Dashboard Admin Utama"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline">Dashboard Admin</span>
          </button>
        )}

        {/* Audio Toggle */}
        <button
          onClick={handleToggleSound}
          aria-label={isMuted ? 'Aktifkan Audio Mikro' : 'Bisukan Audio Mikro'}
          className="p-2 border border-[var(--liquid-glass-border)] bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 backdrop-blur-md text-[var(--text-secondary)] rounded-xl shadow-xs transition-all text-xs active:scale-95"
          title={isMuted ? 'Aktifkan Suara Mikro' : 'Bisukan Suara Mikro'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-400" /> : <Volume2 className="w-3.5 h-3.5 text-[var(--brand-primary)]" />}
        </button>

        {/* Button Refresh Database */}
        <button
          onClick={handleRefreshDatabase}
          disabled={isRefreshing}
          aria-label="Refresh Data dan Sinkronisasi Database"
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--liquid-glass-border)] bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 backdrop-blur-md text-[11px] font-mono text-[var(--text-primary)] rounded-xl shadow-xs transition-all active:scale-95"
          title="Refresh Data & Sinkronisasi Database"
        >
          <RefreshCw className={`w-3 h-3 text-[var(--brand-primary)] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline font-semibold">SYNC</span>
        </button>

        <ThemeToggle />

        <div className="flex items-center gap-2.5 pl-2 border-l border-[var(--border)]">
          <div className="w-8 h-8 bg-gradient-to-br from-[#0F7A73] to-[#0A5954] border border-white/30 text-white text-xs font-mono font-bold rounded-full flex items-center justify-center shadow-xs">
            {isFinanceMode ? 'AF' : 'AD'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
              {isFinanceMode ? 'Amanah Finance' : 'Admin Console'}
            </div>
            <div className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
              {isFinanceMode ? 'Kas & Keuangan' : 'Palembang Ops'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
