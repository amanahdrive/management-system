'use client';

import React from 'react';
import Image from 'next/image';
import { Staff } from '@/types/database';
import { sound } from '@/lib/sound/SoundFX';
import {
  Calendar,
  Wallet,
  RefreshCw,
  LogOut,
  Clock,
  Car,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

interface HeroInstructorCockpitProps {
  staff: Staff;
  totalToday: number;
  completedToday: number;
  nextSessionTime?: string;
  nextStudentName?: string;
  nextStudentPhone?: string;
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
  nextStudentPhone,
  onOpenGajiModal,
  onScrollToSchedule,
  onRefresh,
  isRefreshing,
  onLogout,
}: HeroInstructorCockpitProps) {
  const photoPath = staff.foto_url || `/staff_models/${staff.nama}.png`;
  const [dutyStatus, setDutyStatus] = React.useState<'ready' | 'teaching' | 'break'>('ready');

  // Percentage for today's sessions
  const progressPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <div className="relative border border-[var(--border)] bg-[var(--bg)] rounded-[6px] p-4 sm:p-5 overflow-hidden shadow-xs">
      {/* Subtle Atmospheric Ambient Glow behind cockpit */}
      <div
        className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none opacity-40 dark:opacity-25 blur-3xl"
        style={{
          background: 'radial-gradient(circle, var(--brand-glow) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Top Telemetry Header */}
      <div className="relative flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--brand-primary)] font-bold">
            COCKPIT INSTRUKTUR • FLEET SYSTEM
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              sound.playTactileClick();
              onRefresh();
            }}
            disabled={isRefreshing}
            className="p-1.5 border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] rounded-[3px] transition-colors"
            title="Refresh Jadwal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[var(--brand-primary)]' : ''}`} />
          </button>
          <button
            onClick={() => {
              sound.playTactileClick();
              onLogout();
            }}
            className="px-2 py-1 border border-[var(--border)] hover:border-rose-400 hover:text-rose-600 text-[var(--text-secondary)] transition-colors font-mono text-[10px] uppercase rounded-[3px] flex items-center gap-1"
            title="Ganti Profil Instruktur"
          >
            <LogOut className="w-3 h-3" />
            <span>Ganti</span>
          </button>
        </div>
      </div>

      {/* Instructor Showcase: True Transparent Cutout Model */}
      <div className="relative flex flex-col items-center justify-center pt-5 pb-2 text-center">
        {/* Model Cutout Container with natural aura */}
        <div className="relative w-40 h-48 sm:w-48 sm:h-56 flex items-end justify-center mb-2 select-none pointer-events-none">
          {/* Subtle soft grounding shadow beneath cutout */}
          <div
            className="absolute bottom-1 w-28 h-3 rounded-full bg-black/15 dark:bg-black/40 blur-xs"
            aria-hidden="true"
          />
          <Image
            src={photoPath}
            alt={staff.nama}
            fill
            sizes="(max-width: 640px) 160px, 192px"
            priority
            className="object-contain object-bottom drop-shadow-sm transition-transform duration-300"
          />
        </div>

        {/* Instructor Name & Verification Pill */}
        <div className="flex items-center gap-1.5 mt-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {staff.nama}
          </h1>
          <span title="Instruktur Resmi Terverifikasi">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </span>
        </div>

        {/* Instructor Meta Tag */}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] border border-[var(--brand-primary)]/30 bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold uppercase">
            INSTRUKTUR LAPANGAN
          </span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            ID: {staff.id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Dynamic Shift Duty Status Selector */}
        <div className="mt-3 inline-flex items-center p-0.5 border border-[var(--border)] bg-[var(--bg-subtle)] rounded-[4px] text-[10.5px] font-mono">
          <button
            type="button"
            onClick={() => {
              sound.playTactileClick();
              setDutyStatus('ready');
            }}
            className={`px-2.5 py-1 rounded-[2px] transition-all flex items-center gap-1.5 ${
              dutyStatus === 'ready'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dutyStatus === 'ready' ? 'bg-white' : 'bg-emerald-500'}`} />
            <span>Siap Sesi</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTactileClick();
              setDutyStatus('teaching');
            }}
            className={`px-2.5 py-1 rounded-[2px] transition-all flex items-center gap-1.5 ${
              dutyStatus === 'teaching'
                ? 'bg-amber-600 text-white font-bold shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dutyStatus === 'teaching' ? 'bg-white' : 'bg-amber-500'}`} />
            <span>Di Jalan</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTactileClick();
              setDutyStatus('break');
            }}
            className={`px-2.5 py-1 rounded-[2px] transition-all flex items-center gap-1.5 ${
              dutyStatus === 'break'
                ? 'bg-slate-700 text-white font-bold shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dutyStatus === 'break' ? 'bg-white' : 'bg-slate-400'}`} />
            <span>Istirahat</span>
          </button>
        </div>
      </div>

      {/* High-Precision Telemetry Metrics Strip */}
      <div className="mt-3 border border-[var(--border)] bg-[var(--bg-subtle)] rounded-[4px] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] grid grid-cols-1 sm:grid-cols-3">
        {/* Metric 1: Sesi Hari Ini with micro-progress bar */}
        <div className="p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] uppercase">
            <span>Sesi Hari Ini</span>
            <span className="font-bold text-[var(--text-primary)]">{progressPct}%</span>
          </div>
          <div className="text-lg font-mono font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
            {completedToday} <span className="text-xs font-normal text-[var(--text-secondary)]">/ {totalToday} Selesai</span>
          </div>
          <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Sesi Berikutnya */}
        <div className="p-3">
          <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)]">
            Sesi Berikut
          </span>
          <div className="text-lg font-mono font-bold text-[var(--brand-primary)] tabular-nums mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{nextSessionTime || '--:-- WIB'}</span>
          </div>
          <span className="block font-mono text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
            {totalToday > completedToday ? 'Terjadwal di sistem' : 'Semua sesi selesai'}
          </span>
        </div>

        {/* Metric 3: Siswa Berikutnya & Quick Contact */}
        <div className="p-3 flex flex-col justify-between">
          <div>
            <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)]">
              Siswa Berikut
            </span>
            <span className="block font-mono text-xs font-bold text-[var(--text-primary)] truncate mt-0.5">
              {nextStudentName || 'Belum Ada Siswa'}
            </span>
          </div>
          {nextStudentPhone && (
            <a
              href={`https://wa.me/${nextStudentPhone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sound.playTactileClick()}
              className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Hubungi Siswa</span>
            </a>
          )}
        </div>
      </div>

      {/* Rapid Action Buttons Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
        <button
          onClick={() => {
            sound.playTactileClick();
            onOpenGajiModal();
          }}
          className="p-2.5 border border-[var(--border)] bg-[var(--bg)] hover:border-emerald-500 hover:bg-emerald-500/5 text-[var(--text-primary)] rounded-[4px] transition-all flex items-center justify-center gap-2 font-mono text-xs font-semibold shadow-2xs active:scale-98"
        >
          <Wallet className="w-3.5 h-3.5 text-emerald-600" />
          <span>ESTIMASI GAJI</span>
        </button>

        <button
          onClick={() => {
            sound.playTactileClick();
            onScrollToSchedule();
          }}
          className="p-2.5 border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 text-[var(--text-primary)] rounded-[4px] transition-all flex items-center justify-center gap-2 font-mono text-xs font-semibold shadow-2xs active:scale-98"
        >
          <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          <span>LIHAT JADWAL</span>
        </button>

        <button
          onClick={() => {
            sound.playConfirmChime();
            onRefresh();
          }}
          className="col-span-2 sm:col-span-1 p-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-[4px] transition-all flex items-center justify-center gap-2 font-mono text-xs font-semibold shadow-sm active:scale-98"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>PRESENSI CEPAT</span>
        </button>
      </div>
    </div>
  );
}
