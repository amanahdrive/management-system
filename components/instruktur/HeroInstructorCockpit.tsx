'use client';

import React from 'react';
import Image from 'next/image';
import { Staff } from '@/types/database';
import { sound } from '@/lib/sound/SoundFX';
import { Calendar, Wallet, RefreshCw, LogOut, CheckCircle2, Clock, Car } from 'lucide-react';

interface HeroInstructorCockpitProps {
  staff: Staff;
  totalToday: number;
  completedToday: number;
  nextSessionTime?: string;
  nextStudentName?: string;
  onOpenGajiModal: () => void;
  onScrollToSchedule: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onLogout: () => void;
}

export function HeroInstructorCockpit({
  staff,
  totalToday,
  completedToday,
  nextSessionTime,
  nextStudentName,
  onOpenGajiModal,
  onScrollToSchedule,
  onRefresh,
  isRefreshing,
  onLogout,
}: HeroInstructorCockpitProps) {
  const photoPath = staff.foto_url || `/staff_models/${staff.nama}.png`;

  return (
    <div 
      className="border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-5 relative overflow-hidden"
      style={{ borderRadius: 0 }}
    >
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
            INSTRUKTUR BERTUGAS • ON DUTY
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              sound.playTactileClick();
              onRefresh();
            }}
            disabled={isRefreshing}
            className="p-1.5 border border-[var(--border)] bg-[var(--bg)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] transition-colors"
            title="Refresh Jadwal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[var(--brand-primary)]' : ''}`} />
          </button>
          <button
            onClick={() => {
              sound.playTactileClick();
              onLogout();
            }}
            className="px-2 py-1 border border-[var(--border)] hover:border-rose-400 hover:text-rose-600 text-[var(--text-secondary)] transition-colors font-mono text-[10px] uppercase flex items-center gap-1"
            title="Ganti Profil Instruktur"
          >
            <LogOut className="w-3 h-3" />
            <span>Ganti</span>
          </button>
        </div>
      </div>

      {/* Centered Instructor Hero Showcase (Without background photo centered) */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2 text-center relative">
        <div className="relative w-36 h-44 sm:w-44 sm:h-52 flex items-end justify-center mb-2">
          <Image
            src={photoPath}
            alt={staff.nama}
            fill
            sizes="(max-width: 640px) 144px, 176px"
            priority
            className="object-contain object-bottom drop-shadow-md"
          />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {staff.nama}
        </h1>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="font-mono text-[10px] px-2 py-0.5 border border-[var(--brand-primary)]/30 bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold uppercase">
            FLEET INSTRUCTOR
          </span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            ID: {staff.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>

      {/* 3-Column Telemetric Status Strip */}
      <div className="grid grid-cols-3 gap-px bg-[var(--border)] border border-[var(--border)] my-3">
        <div className="bg-[var(--bg)] p-2.5 text-center">
          <span className="block font-mono text-[9px] uppercase text-[var(--text-muted)]">
            Sesi Hari Ini
          </span>
          <span className="font-mono text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums">
            {completedToday}/{totalToday}
          </span>
        </div>

        <div className="bg-[var(--bg)] p-2.5 text-center">
          <span className="block font-mono text-[9px] uppercase text-[var(--text-muted)]">
            Sesi Berikut
          </span>
          <span className="font-mono text-base sm:text-lg font-bold text-[var(--brand-primary)] tabular-nums">
            {nextSessionTime || '--:--'}
          </span>
        </div>

        <div className="bg-[var(--bg)] p-2.5 text-center truncate">
          <span className="block font-mono text-[9px] uppercase text-[var(--text-muted)]">
            Siswa Berikut
          </span>
          <span className="block truncate font-mono text-xs sm:text-sm font-semibold text-[var(--text-primary)] mt-0.5">
            {nextStudentName || 'Tidak Ada'}
          </span>
        </div>
      </div>

      {/* Rapid Action Buttons Beneath Profile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        <button
          onClick={() => {
            sound.playTactileClick();
            onOpenGajiModal();
          }}
          className="p-2 border border-[var(--border)] bg-[var(--bg-subtle)] hover:border-emerald-500 text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1.5 font-mono text-xs font-semibold"
          style={{ borderRadius: 0 }}
        >
          <Wallet className="w-3.5 h-3.5 text-emerald-600" />
          <span>ESTIMASI GAJI</span>
        </button>

        <button
          onClick={() => {
            sound.playTactileClick();
            onScrollToSchedule();
          }}
          className="p-2 border border-[var(--border)] bg-[var(--bg-subtle)] hover:border-[var(--brand-primary)] text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1.5 font-mono text-xs font-semibold"
          style={{ borderRadius: 0 }}
        >
          <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          <span>LIHAT JADWAL</span>
        </button>

        <button
          onClick={() => {
            sound.playConfirmChime();
            onRefresh();
          }}
          className="col-span-2 sm:col-span-1 p-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white transition-colors flex items-center justify-center gap-1.5 font-mono text-xs font-semibold"
          style={{ borderRadius: 0 }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>PRESENSI CEPAT</span>
        </button>
      </div>
    </div>
  );
}
