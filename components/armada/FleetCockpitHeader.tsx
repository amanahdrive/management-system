'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { sound } from '@/lib/sound/SoundFX';
import {
  Volume2,
  VolumeX,
  RefreshCw,
  Download,
  Sun,
  Moon,
} from 'lucide-react';

interface FleetCockpitHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenIncident?: () => void;
  onOpenSchedule?: () => void;
  onInstallPwa?: () => void;
  canInstall?: boolean;
}

export function FleetCockpitHeader({
  onRefresh,
  isRefreshing,
  onInstallPwa,
  canInstall = false,
}: FleetCockpitHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(sound.getMuted());

  React.useEffect(() => {
    setMounted(true);
    // Background auto-switch sesuai jam WIB (18:00 WIB dark, 06:00 WIB light) jika belum ada preference
    try {
      const saved = localStorage.getItem('amanah_armada_theme_mode');
      if (!saved) {
        const now = new Date();
        const utc = now.getTime() + now.getTimezoneOffset() * 60000;
        const wib = new Date(utc + 7 * 3600000);
        const h = wib.getHours();
        const scheduled = h >= 6 && h < 18 ? 'light' : 'dark';
        setTheme(scheduled);
      }
    } catch {}
  }, [setTheme]);

  // Dynamic WIB Greeting (Selamat Pagi / Siang / Sore / Malam)
  const greeting = React.useMemo(() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const wib = new Date(utc + 7 * 3600000);
    const h = wib.getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }, []);

  const toggleTheme = () => {
    sound.click();
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('amanah_armada_theme_mode', next);
    } catch {}
  };

  const toggleAudio = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
    if (!next) {
      sound.chime();
    }
  };

  const isDark = mounted && theme === 'dark';

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 py-2.5 transition-colors">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Sisi Kiri: Sapaan Alfi + Identitas Armada */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)] text-white flex items-center justify-center font-bold text-xs shrink-0 tracking-tight">
            AD
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-[var(--text-secondary)] font-medium flex items-center gap-1.5 truncate">
              <span>{greeting}, Alfi</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            </div>
            <h1 className="text-xs font-bold tracking-tight text-[var(--text-primary)] uppercase truncate">
              PIC Armada
            </h1>
          </div>
        </div>

        {/* Sisi Kanan: Refresh, Theme Toggle Sederhana & Audio */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Tombol Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
            title="Perbarui Data"
            aria-label="Perbarui Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[var(--brand-primary)]' : ''}`} />
          </button>

          {/* Ikon Tema Sederhana (Sun/Moon - Tanpa Indikator WIB / Dropdown) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
            title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            )}
          </button>

          {/* Audio Toggle */}
          <button
            type="button"
            onClick={toggleAudio}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
            title={isMuted ? 'Aktifkan Suara' : 'Matikan Suara'}
            aria-label="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 opacity-50" /> : <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          </button>

          {/* Install PWA (jika tersedia) */}
          {canInstall && onInstallPwa && (
            <button
              type="button"
              onClick={onInstallPwa}
              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all active:scale-95"
              title="Pasang PWA"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
