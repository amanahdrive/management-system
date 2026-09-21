'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Clock, Check, ChevronDown } from 'lucide-react';
import { sound } from '@/lib/sound/SoundFX';

export type ThemePreferenceMode = 'auto_wib' | 'light' | 'dark';

/**
 * Menghitung waktu WIB (UTC+7) secara akurat terlepas dari timezone lokal perangkat pengguna.
 */
export function getWibDate(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 7 * 3600000);
}

export function getWibTimeString(): string {
  const d = getWibDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} WIB`;
}

export function getWibScheduledTheme(): 'dark' | 'light' {
  const hour = getWibDate().getHours();
  // Pukul 06:00 s/d 17:59 WIB => Light Mode
  // Pukul 18:00 s/d 05:59 WIB => Dark Mode
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

export function WibThemeToggle({
  compact = false,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [mode, setMode] = React.useState<ThemePreferenceMode>('auto_wib');
  const [wibTimeStr, setWibTimeStr] = React.useState<string>('06:00 WIB');
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Inisialisasi preferensi & listener waktu WIB
  React.useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('amanah_armada_theme_mode') as ThemePreferenceMode | null;
    const initialMode = saved && ['auto_wib', 'light', 'dark'].includes(saved) ? saved : 'auto_wib';
    setMode(initialMode);
    setWibTimeStr(getWibTimeString());

    // Terapkan tema sesuai mode
    if (initialMode === 'auto_wib') {
      const scheduled = getWibScheduledTheme();
      setTheme(scheduled);
    } else {
      setTheme(initialMode);
    }

    // Interval cek waktu setiap 15 detik agar pergantian jam 06.00 dan 18.00 responsif
    const interval = setInterval(() => {
      setWibTimeStr(getWibTimeString());
      const currentMode = (localStorage.getItem('amanah_armada_theme_mode') as ThemePreferenceMode) || 'auto_wib';
      if (currentMode === 'auto_wib') {
        const scheduled = getWibScheduledTheme();
        setTheme(scheduled);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [setTheme]);

  // Handle outside click untuk dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const selectMode = (newMode: ThemePreferenceMode) => {
    try {
      sound.click();
    } catch {}
    setMode(newMode);
    localStorage.setItem('amanah_armada_theme_mode', newMode);
    if (newMode === 'auto_wib') {
      const scheduled = getWibScheduledTheme();
      setTheme(scheduled);
    } else {
      setTheme(newMode);
    }
    setShowDropdown(false);
  };

  if (!mounted) {
    return <div className="w-24 h-8 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />;
  }

  const isDarkActive = theme === 'dark';
  const hour = getWibDate().getHours();
  const isWibNight = hour >= 18 || hour < 6;

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {compact ? (
        <button
          type="button"
          onClick={() => setShowDropdown((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all active:scale-95 shadow-xs select-none ${
            mode === 'auto_wib'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-[var(--border)] bg-black/5 dark:bg-white/5 text-[var(--text-primary)]'
          }`}
          title="Pengaturan Mode Tema (Auto WIB / Terang / Gelap)"
        >
          {mode === 'auto_wib' ? (
            <>
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-mono text-[11px] font-bold tracking-tight">WIB {wibTimeStr.slice(0, 5)}</span>
              {isDarkActive ? <Moon className="w-3 h-3 text-cyan-400" /> : <Sun className="w-3 h-3 text-amber-500" />}
            </>
          ) : mode === 'dark' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-medium">Gelap</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-medium">Terang</span>
            </>
          )}
          <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowDropdown((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all active:scale-95 shadow-xs select-none ${
            mode === 'auto_wib'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-[var(--border)] bg-black/5 dark:bg-white/5 text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {mode === 'auto_wib' ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : null}
            {isDarkActive ? (
              <Moon className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className="font-medium">
              {mode === 'auto_wib' ? `Auto WIB (${wibTimeStr.slice(0, 5)})` : mode === 'dark' ? 'Mode Gelap' : 'Mode Terang'}
            </span>
          </div>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      )}

      {/* Popover Menu Pilihan Mode */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-[var(--bg)] border border-[var(--border-strong)] rounded-2xl shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-2.5 py-1.5 border-b border-[var(--border)] mb-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Tema & Jam WIB
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {wibTimeStr}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Jadwal otomatis: 06.00 Light • 18.00 Dark
            </p>
          </div>

          <div className="space-y-1">
            {/* Opsi 1: Auto WIB (Rekomendasi) */}
            <button
              type="button"
              onClick={() => selectMode('auto_wib')}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all active:scale-[0.98] ${
                mode === 'auto_wib'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span>Otomatis WIB</span>
                    <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md font-bold">
                      Default
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] block">
                    {isWibNight ? 'Saat ini: Dark Mode (Malam)' : 'Saat ini: Light Mode (Siang)'}
                  </span>
                </div>
              </div>
              {mode === 'auto_wib' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            </button>

            {/* Opsi 2: Manual Terang */}
            <button
              type="button"
              onClick={() => selectMode('light')}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all active:scale-[0.98] ${
                mode === 'light'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Sun className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span>Paksa Mode Terang</span>
                  <span className="text-[10px] text-[var(--text-muted)] block">Tetap terang sepanjang waktu</span>
                </div>
              </div>
              {mode === 'light' && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
            </button>

            {/* Opsi 3: Manual Gelap */}
            <button
              type="button"
              onClick={() => selectMode('dark')}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all active:scale-[0.98] ${
                mode === 'dark'
                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/20'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span>Paksa Mode Gelap</span>
                  <span className="text-[10px] text-[var(--text-muted)] block">Tetap gelap (Graphite Console)</span>
                </div>
              </div>
              {mode === 'dark' && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
