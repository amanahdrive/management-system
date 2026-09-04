'use client';

import React from 'react';
import Image from 'next/image';
import { ThemeToggle } from '../shared/ThemeToggle';
import { useUiStore } from '@/lib/store/ui-store';
import { RefreshCw, Check, Volume2, VolumeX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { sound } from '@/lib/sound/SoundFX';

export function Topbar() {
  const { sidebarOpen } = useUiStore();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<string>('');
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);

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
    router.refresh();
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    setLastSyncTime(`${h}:${m}:${s} WIB`);
    sound.playConfirmChime();

    setTimeout(() => {
      setIsRefreshing(false);
      setToastMessage('Database berhasil disinkronkan & diperbarui!');
      setTimeout(() => setToastMessage(null), 3000);
    }, 600);
  };

  return (
    <header
      className={`h-14 fixed top-0 right-0 z-30 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 transition-all duration-300 left-0 ${
        sidebarOpen ? 'md:left-64' : 'md:left-20'
      }`}
    >
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 bg-emerald-800 text-white text-xs font-mono border border-emerald-600 flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left: Mobile Brand & Database Sync Status */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex items-center gap-2">
          <Image
            src="/assets/logo-amdri-symbol.png"
            alt="Logo"
            width={24}
            height={24}
            className="object-contain"
          />
          <span className="font-brand font-bold text-sm text-[var(--brand-primary)]">Amanah Drive</span>
        </div>

        {/* Live Database Sync Telemetry */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[var(--bg)] border border-[var(--border)] text-[10px] font-mono">
          <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" />
          <span className="text-[var(--text-muted)] uppercase tracking-wider">SYNC:</span>
          <span className="text-[var(--text-primary)] tabular-nums">
            {lastSyncTime ? `${lastSyncTime}` : 'ONLINE'}
          </span>
        </div>
      </div>

      {/* Right: Audio Toggle, Refresh DB, Theme Toggle & Admin Badge */}
      <div className="flex items-center gap-2">
        {/* Audio Toggle */}
        <button
          onClick={handleToggleSound}
          aria-label={isMuted ? 'Aktifkan Audio Mikro' : 'Bisukan Audio Mikro'}
          className="p-1.5 border border-[var(--border)] bg-[var(--bg)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] transition-colors text-xs"
          title={isMuted ? 'Aktifkan Suara Mikro' : 'Bisukan Suara Mikro'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-400" /> : <Volume2 className="w-3.5 h-3.5 text-[var(--brand-primary)]" />}
        </button>

        {/* Button Refresh Database */}
        <button
          onClick={handleRefreshDatabase}
          disabled={isRefreshing}
          aria-label="Refresh Data dan Sinkronisasi Database"
          className="flex items-center gap-1 px-2.5 py-1.5 border border-[var(--border)] bg-[var(--bg)] hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-mono text-[var(--text-primary)] transition-colors"
          title="Refresh Data & Sinkronisasi Database"
        >
          <RefreshCw className={`w-3 h-3 text-[var(--brand-primary)] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">SYNC</span>
        </button>

        <ThemeToggle />

        <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
          <div className="w-7 h-7 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-mono font-bold flex items-center justify-center">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-[var(--text-primary)] leading-tight">Admin Console</div>
            <div className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Palembang Ops</div>
          </div>
        </div>
      </div>
    </header>
  );
}
