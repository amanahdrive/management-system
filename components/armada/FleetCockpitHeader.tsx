'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { WibThemeToggle } from './WibThemeToggle';
import { sound } from '@/lib/sound/SoundFX';
import {
  Car,
  Volume2,
  VolumeX,
  RefreshCw,
  Download,
  AlertOctagon,
  Calendar,
  Layers,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
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

  const toggleAudio = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
    if (!next) {
      sound.chime();
    }
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--bg)]/85 border-b border-[var(--border)] transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Sisi Kiri: Branding & Profil Role PIC Armada */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/kendaraan"
              className="p-1.5 rounded-xl border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] transition-all active:scale-95"
              title="Kembali ke Dashboard Utama"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-xs border border-[var(--border)] shrink-0">
              <Image
                src="/assets/app-icon-1024.png"
                alt="Amanah Drive"
                width={32}
                height={32}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-[var(--text-primary)]">
                  AMANAH DRIVE
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-md">
                  PIC ARMADA
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Fleet Console • Standby</span>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Live WIB Theme Toggle, Sound, Refresh & Quick Actions */}
          <div className="flex items-center gap-1.5">
            {/* WIB Scheduled Theme Toggle */}
            <WibThemeToggle compact />

            {/* Tombol Audio / Sound FX */}
            <button
              type="button"
              onClick={toggleAudio}
              className={`p-1.5 rounded-xl border text-[var(--text-secondary)] transition-all active:scale-95 shadow-xs ${
                isMuted
                  ? 'border-[var(--border)] bg-black/5 dark:bg-white/5 opacity-60'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
              title={isMuted ? 'Aktifkan Efek Suara Haptic' : 'Matikan Suara'}
              aria-label="Toggle Sound"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Tombol Install PWA jika tersedia */}
            {canInstall && onInstallPwa && (
              <button
                type="button"
                onClick={onInstallPwa}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                title="Pasang Aplikasi ke Layar Utama"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}

            {/* Tombol Refresh Data */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-xl border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] transition-all active:scale-95 shadow-xs disabled:opacity-50"
              title="Muat Ulang Data Armada"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Action Pills Bar di Header (Mobile-Friendly) */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border)] overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={onOpenSchedule}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--card-bg)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-[11px] font-semibold text-[var(--text-primary)] shrink-0 transition-all active:scale-95 shadow-xs"
          >
            <Calendar className="w-3 h-3 text-[var(--brand-primary)]" />
            <span>Jadwal Mobil Hari Ini</span>
          </button>

          <button
            type="button"
            onClick={onOpenIncident}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 text-[11px] font-bold text-rose-600 dark:text-rose-400 shrink-0 transition-all active:scale-95 shadow-xs"
          >
            <ShieldAlert className="w-3 h-3 text-rose-500" />
            <span>Lapor Insiden Cepat</span>
          </button>
        </div>
      </div>
    </header>
  );
}
