'use client';

import React from 'react';
import { Staff, JadwalSesi } from '@/types/database';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo } from '@/lib/utils/date';
import { sound } from '@/lib/sound/SoundFX';
import { X, Wallet } from 'lucide-react';

interface EstimasiGajiModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
  completedSessionsCount: number;
  completedList: JadwalSesi[];
  monthLabel: string;
}

export function EstimasiGajiModal({
  isOpen,
  onClose,
  staff,
  completedSessionsCount,
  completedList,
  monthLabel,
}: EstimasiGajiModalProps) {
  if (!isOpen) return null;

  const ratePerSesi = 50000;
  const komisiSesi = completedSessionsCount * ratePerSesi;
  const estimasiTotal = komisiSesi;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-lg bg-[var(--bg)] border border-[var(--border)] shadow-2xl flex flex-col max-h-[90vh]"
        style={{ borderRadius: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[var(--brand-primary)]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Estimasi Gaji & Komisi Instruktur
            </h2>
          </div>
          <button
            onClick={() => {
              sound.playTactileClick();
              onClose();
            }}
            aria-label="Tutup Modal"
            className="p-1 border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Driver ID Strip */}
          <div className="flex items-center justify-between p-2.5 bg-[var(--bg-subtle)] border border-[var(--border)]">
            <div>
              <span className="font-bold text-[var(--text-primary)] text-sm block">
                {staff.nama}
              </span>
              <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                Periode: {monthLabel}
              </span>
            </div>
            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase font-semibold">
              ON DUTY
            </span>
          </div>

          {/* Telemetric Breakdown Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 border border-[var(--border)] bg-[var(--bg)] space-y-1">
              <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] block">
                Sesi Diselesaikan
              </span>
              <div className="text-xl font-mono font-bold text-[var(--text-primary)] tabular-nums">
                {completedSessionsCount} <span className="text-xs font-normal text-[var(--text-secondary)]">Sesi</span>
              </div>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                Tarif: {formatRupiah(ratePerSesi)}/sesi
              </span>
            </div>

            <div className="p-3 border border-emerald-500/30 bg-emerald-500/5 space-y-1">
              <span className="font-mono text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-semibold block">
                Estimasi Komisi Sesi
              </span>
              <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatRupiah(komisiSesi)}
              </div>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                Perhitungan berjalan
              </span>
            </div>
          </div>

          {/* Net Highlight Tile */}
          <div className="p-3 border border-[var(--brand-primary)] bg-[var(--brand-primary-light)] flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] uppercase font-bold text-[var(--brand-primary)] block">
                Estimasi Total Diterima
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                *Belum termasuk bonus performa & tips siswa
              </span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-bold text-[var(--brand-primary)] tabular-nums">
              {formatRupiah(estimasiTotal)}
            </div>
          </div>

          {/* Completed Sessions Log Table */}
          <div className="space-y-2 pt-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block">
              Riwayat Sesi Selesai Bulan Ini ({completedList.length})
            </span>
            {completedList.length === 0 ? (
              <div className="py-6 text-center border border-[var(--border)] font-mono text-[11px] text-[var(--text-muted)]">
                Belum ada sesi selesai pada periode ini.
              </div>
            ) : (
              <div className="border border-[var(--border)] max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border)] font-mono text-[10px] uppercase text-[var(--text-muted)]">
                    <tr>
                      <th className="p-2">Tgl</th>
                      <th className="p-2">Siswa</th>
                      <th className="p-2 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-mono text-[11px]">
                    {completedList.map((j) => (
                      <tr key={j.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                        <td className="p-2 text-[var(--text-secondary)]">
                          {formatDateIndo(j.tanggal_sesi).slice(0, 6)}
                        </td>
                        <td className="p-2 font-medium text-[var(--text-primary)] truncate max-w-[140px]">
                          {j.siswa?.nama || 'Siswa'}
                        </td>
                        <td className="p-2 text-right font-bold text-emerald-600 tabular-nums">
                          +{formatRupiah(ratePerSesi)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-subtle)] flex justify-end gap-2">
          <button
            onClick={() => {
              sound.playTactileClick();
              onClose();
            }}
            className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-mono text-xs uppercase font-bold transition-colors"
            style={{ borderRadius: 0 }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
