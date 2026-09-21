'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '../shared/ThemeToggle';
import { useUiStore } from '@/lib/store/ui-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { getCurrentUser } from '@/lib/actions/auth';
import { RefreshCw, Check, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { sound } from '@/lib/sound/SoundFX';
import { purgeServerCache } from '@/lib/actions/cache';
import { triggerAppRefresh } from '@/lib/utils/refresh-event';
import { checkIsFinanceMode, clearFinanceMode } from '@/lib/utils/finance-mode';
import { ASSETS } from '@/lib/assets';
import { AccountSettingsModal } from './AccountSettingsModal';

/**
 * Calculate dynamic Indonesian greeting based on Asia/Jakarta (WIB) time
 */
function getWibGreeting(name?: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(formatter.format(new Date()), 10);
    let greeting = 'Selamat Datang';
    if (hour >= 4 && hour < 11) {
      greeting = 'Selamat Pagi';
    } else if (hour >= 11 && hour < 15) {
      greeting = 'Selamat Siang';
    } else if (hour >= 15 && hour < 18) {
      greeting = 'Selamat Sore';
    } else {
      greeting = 'Selamat Malam';
    }
    return name ? `${greeting}, ${name}` : greeting;
  } catch {
    return name ? `Halo, ${name}` : 'Selamat Datang';
  }
}

export function Topbar() {
  const { sidebarOpen } = useUiStore();
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<string>('');
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isFinanceMode, setIsFinanceMode] = React.useState(false);
  const [logoSrc, setLogoSrc] = React.useState<string>(ASSETS.logo.symbol);
  const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false);

  // Sync current user if not already in zustand store
  React.useEffect(() => {
    if (!user) {
      getCurrentUser().then((u) => {
        if (u) setUser(u);
      });
    }
  }, [user, setUser]);

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

  const displayAvatar = user?.foto_url || (user?.staff?.foto_url ? user?.staff.foto_url : null);

  return (
    <>
      <header
        className={`h-14 fixed top-0 right-0 z-30 bg-[var(--liquid-glass-bg)] backdrop-blur-2xl border-b border-[var(--liquid-glass-border)] flex items-center justify-between px-4 md:px-6 transition-all duration-300 left-0 shadow-xs ${
          sidebarOpen ? 'md:left-64' : 'md:left-20'
        }`}
      >
        {/* Toast Notification Alert */}
        {toastMessage && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-800/90 backdrop-blur-md text-white text-xs font-mono border border-emerald-500/40 rounded-xl shadow-2xl flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Left: Mobile Brand & Database Sync Status */}
        <div className="flex items-center gap-3">
          <div className="md:hidden flex items-center gap-2">
            <Link href={isFinanceMode ? '/finance' : '/dashboard'} className="flex items-center gap-2">
              <div className="relative w-7 h-7 shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20">
                <Image
                  src={logoSrc}
                  alt="Amanah Drive Logo"
                  width={28}
                  height={28}
                  unoptimized
                  onError={() => {
                    if (logoSrc !== '/logo-amdri-symbol.png') {
                      setLogoSrc('/logo-amdri-symbol.png');
                    }
                  }}
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
              <span className="font-brand font-bold text-sm text-[var(--brand-primary)]">
                {isFinanceMode ? 'Amanah Finance' : 'Amanah Drive'}
              </span>
            </Link>
          </div>

          {/* Live Database Sync Telemetry (Clean square rounded-md, no pill) */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-[var(--liquid-glass-border)] rounded-md text-[10px] font-mono shadow-xs">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[var(--text-muted)] uppercase tracking-wider font-semibold">SYNC:</span>
            <span className="text-[var(--text-primary)] font-bold tabular-nums">
              {lastSyncTime ? `${lastSyncTime}` : 'ONLINE'}
            </span>
          </div>
        </div>

        {/* Right: Audio Toggle, Refresh DB, Theme Toggle & Account Profile */}
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
            className="p-2 border border-[var(--liquid-glass-border)] bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 backdrop-blur-md text-[var(--text-secondary)] rounded-xl shadow-xs transition-all text-xs active:scale-95 cursor-pointer"
            title={isMuted ? 'Aktifkan Suara Mikro' : 'Bisukan Suara Mikro'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-400" /> : <Volume2 className="w-3.5 h-3.5 text-[var(--brand-primary)]" />}
          </button>

          {/* Button Refresh Database */}
          <button
            onClick={handleRefreshDatabase}
            disabled={isRefreshing}
            aria-label="Refresh Data dan Sinkronisasi Database"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--liquid-glass-border)] bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 backdrop-blur-md text-[11px] font-mono text-[var(--text-primary)] rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Refresh Data & Sinkronisasi Database"
          >
            <RefreshCw className={`w-3 h-3 text-[var(--brand-primary)] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline font-semibold">SYNC</span>
          </button>

          <ThemeToggle />

          {/* User Account Settings Trigger Button */}
          <button
            type="button"
            onClick={() => {
              sound.playTactileClick();
              setIsAccountModalOpen(true);
            }}
            className="flex items-center gap-2.5 pl-2 border-l border-[var(--border)] hover:opacity-90 transition-opacity cursor-pointer group text-left"
            title="Buka Pengaturan Akun"
          >
            <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-emerald-600/10 border border-emerald-600/20 text-emerald-600 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:border-[var(--brand-primary)] transition-colors">
              {displayAvatar ? (
                <Image
                  src={displayAvatar}
                  alt={user?.nama || 'User'}
                  fill
                  unoptimized
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                user?.nama?.slice(0, 2).toUpperCase() || 'AD'
              )}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <div className="text-xs font-semibold text-[var(--text-primary)] leading-tight truncate group-hover:text-[var(--brand-primary)] transition-colors">
                {getWibGreeting(user?.nama)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1 mt-0.5">
                <span className="font-mono uppercase text-emerald-700 dark:text-emerald-300 font-bold">
                  {user?.roles?.includes('developer') ? 'Developer' : user?.roles?.[0] || 'Staff'}
                </span>
                <span>•</span>
                <span className="hover:underline text-[var(--brand-primary)] font-semibold">Pengaturan</span>
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        user={user}
      />
    </>
  );
}

