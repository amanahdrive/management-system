'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { WibThemeToggle } from './WibThemeToggle';
import { sound } from '@/lib/sound/SoundFX';
import {
  Volume2,
  VolumeX,
  RefreshCw,
  Download,
  ArrowLeft,
  Calendar,
  ShieldAlert,
  Car,
} from 'lucide-react';

interface FleetCockpitHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenIncident: () => void;
  onOpenSchedule: () => void;
  onInstallPwa?: () => void;
  canInstall?: boolean;
}

export function FleetCockpitHeader({
  onRefresh,
  isRefreshing,
  onOpenIncident,
  onOpenSchedule,
  onInstallPwa,
  canInstall = false,
}: FleetCockpitHeaderProps) {
  const [isMuted, setIsMuted] = React.useState(sound.getMuted());

  // Dynamic WIB Greeting (Selamat Pagi / Siang / Sore / Malam)
  const greeting = React.useMemo(() => {
    const now = new Date();
    // Convert to Jakarta WIB (UTC+7)
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const wib = new Date(utc + 7 * 3600000);
    const h = wib.getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }, []);

  const toggleAudio = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
    if (!next) {
      sound.chime();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[var(--liquid-glass-bg)] backdrop-blur-2xl border-b border-[var(--liquid-glass-border)] px-4 py-3 shadow-xs transition-colors duration-200">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Sisi Kiri: Logo + Sapaan "Selamat Pagi, Alfi" Mirip PWA Finance */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F7A73] to-[#0A5954] border border-white/20 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            AD
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[var(--text-secondary)] font-semibold flex items-center gap-1 truncate">
              <span>{greeting}, Alfi</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
            <h1 className="text-xs font-black tracking-tight text-[var(--brand-primary)] uppercase truncate">
              Amanah Drive Armada
            </h1>
          </div>
        </div>

        {/* Sisi Kanan: Tombol Admin, Refresh, Theme WIB & Suara */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Tombol Cepat Kembali ke Admin Console (Mirip PWA Finance) */}
          <Link
            href="/kendaraan"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--liquid-glass-border)] bg-white/50 dark:bg-white/5 hover:bg-emerald-500/10 text-[var(--text-secondary)] hover:text-emerald-700 dark:hover:text-emerald-300 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
            title="Kembali ke Dashboard Manajemen Armada"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Admin</span>
          </Link>

          {/* Tombol Install PWA jika tersedia */}
          {canInstall && onInstallPwa && (
            <button
              type="button"
              onClick={onInstallPwa}
              className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95"
              title="Pasang Aplikasi ke Layar Utama"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Tombol Refresh Data */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[var(--liquid-glass-border)] bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 text-[var(--text-secondary)] transition-all active:scale-95"
            title="Perbarui Data Armada"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[var(--brand-primary)]' : ''}`} />
          </button>

          {/* WIB Scheduled Theme Toggle */}
          <WibThemeToggle compact />

          {/* Tombol Audio / Sound FX */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-2 rounded-xl border text-[var(--text-secondary)] transition-all active:scale-95 shadow-xs ${
              isMuted
                ? 'border-[var(--liquid-glass-border)] bg-white/50 dark:bg-white/5 opacity-60'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
            title={isMuted ? 'Aktifkan Efek Suara Haptic' : 'Matikan Suara'}
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
