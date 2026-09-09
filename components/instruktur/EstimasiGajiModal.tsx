'use client';

import React from 'react';
import { Staff, JadwalSesi } from '@/types/database';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString, addDaysToDateStr } from '@/lib/utils/date';
import { sound } from '@/lib/sound/SoundFX';
import { getRekapMingguanInstruktur, RekapMingguanInstrukturResult } from '@/lib/actions/jadwal';
import {
  X,
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Utensils,
  Car,
  RefreshCw,
} from 'lucide-react';

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
  const [viewMode, setViewMode] = React.useState<'mingguan' | 'bulanan'>('mingguan');
  const [anchorDate, setAnchorDate] = React.useState<string>(getTodayDateString());
  const [rekapMingguan, setRekapMingguan] = React.useState<RekapMingguanInstrukturResult | null>(null);
  const [loadingWeekly, setLoadingWeekly] = React.useState(false);

  const loadWeeklyData = React.useCallback(async (targetDate: string) => {
    if (!staff.id) return;
    setLoadingWeekly(true);
    try {
      const data = await getRekapMingguanInstruktur(staff.id, targetDate);
      setRekapMingguan(data);
    } catch (err) {
      console.error('Error loading weekly recap:', err);
    } finally {
      setLoadingWeekly(false);
    }
  }, [staff.id]);

  React.useEffect(() => {
    if (isOpen) {
      loadWeeklyData(anchorDate);
    }
  }, [isOpen, anchorDate, loadWeeklyData]);

  if (!isOpen) return null;

  const handlePrevWeek = () => {
    sound.playMechanicalTick();
    const prev = addDaysToDateStr(anchorDate, -7);
    setAnchorDate(prev);
  };

  const handleNextWeek = () => {
    sound.playMechanicalTick();
    const next = addDaysToDateStr(anchorDate, 7);
    setAnchorDate(next);
  };

  const handleResetCurrentWeek = () => {
    sound.playTactileClick();
    setAnchorDate(getTodayDateString());
  };

  const ratePerSesi = 50000;
  const komisiBulanan = completedSessionsCount * ratePerSesi;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg liquid-glass border border-[var(--liquid-glass-border)] shadow-2xl rounded-3xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--liquid-glass-border)] bg-transparent">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Estimasi Gaji & Komisi Instruktur
              </h2>
              <p className="text-[10px] text-[var(--text-muted)]">
                {staff.nama} ({staff.kode_staff || 'AM-00'})
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTactileClick();
              onClose();
            }}
            aria-label="Tutup Modal"
            className="p-1.5 border border-[var(--liquid-glass-border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector: Mingguan (Default) vs Bulanan */}
        <div className="p-3 pb-0">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-[var(--liquid-glass-border)] text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                sound.playTactileClick();
                setViewMode('mingguan');
              }}
              className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'mingguan'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Mingguan (Min-Sab)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playTactileClick();
                setViewMode('bulanan');
              }}
              className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'bulanan'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bulanan</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {viewMode === 'mingguan' ? (
            <>
              {/* Weekly Navigation Bar */}
              <div className="p-3 bg-white/50 dark:bg-black/30 border border-[var(--liquid-glass-border)] rounded-2xl flex items-center justify-between gap-2 shadow-xs">
                <button
                  onClick={handlePrevWeek}
                  className="p-1.5 border border-[var(--liquid-glass-border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] rounded-xl transition-colors"
                  title="Minggu Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-center min-w-0 flex-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--brand-primary)] font-bold block">
                    SIKLUS MINGGU - SABTU
                  </span>
                  <span className="font-bold text-xs text-[var(--text-primary)] truncate block">
                    {rekapMingguan?.periodeLabel || 'Memuat periode...'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleResetCurrentWeek}
                    className="px-2 py-1 border border-[var(--liquid-glass-border)] hover:bg-black/5 dark:hover:bg-white/5 text-[10px] font-mono font-semibold text-[var(--text-secondary)] rounded-lg"
                    title="Kembali ke Minggu Ini"
                  >
                    Hari Ini
                  </button>
                  <button
                    onClick={handleNextWeek}
                    className="p-1.5 border border-[var(--liquid-glass-border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] rounded-xl transition-colors"
                    title="Minggu Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {loadingWeekly ? (
                <div className="h-36 flex items-center justify-center font-mono text-xs text-[var(--brand-primary)] gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>MENGKALKULASI REKAP MINGGUAN...</span>
                </div>
              ) : (
                <>
                  {/* Highlight Estimasi Total Gaji Mingguan */}
                  <div className="p-4 border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl flex items-center justify-between shadow-xs">
                    <div>
                      <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                        Estimasi Gaji Mingguan
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {rekapMingguan?.totalSesi || 0} sesi selesai • {rekapMingguan?.activeDaysCount || 0} hari bertugas
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatRupiah(rekapMingguan?.totalGajiMingguan || 0)}
                    </div>
                  </div>

                  {/* Rincian Komponen: Fee Sesi & Uang Makan */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Card 1: Fee Mengemudi */}
                    <div className="p-3.5 border border-[var(--liquid-glass-border)] bg-white/50 dark:bg-black/30 rounded-2xl space-y-1 shadow-xs">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <Car className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                        <span className="font-mono text-[10px] uppercase font-semibold">Fee Mengemudi</span>
                      </div>
                      <div className="text-lg font-mono font-bold text-[var(--text-primary)] tabular-nums">
                        {formatRupiah(
                          (rekapMingguan?.feeOperasionalTotal || 0) + (rekapMingguan?.feePribadiTotal || 0)
                        )}
                      </div>
                      <span className="font-mono text-[9.5px] text-[var(--text-secondary)] block">
                        {rekapMingguan?.operasionalCount || 0} Sesi @ {formatRupiah(rekapMingguan?.rates.feeOperasional || 50000)}
                      </span>
                    </div>

                    {/* Card 2: Uang Makan Harian */}
                    <div className="p-3.5 border border-[var(--liquid-glass-border)] bg-white/50 dark:bg-black/30 rounded-2xl space-y-1 shadow-xs">
                      <div className="flex items-center gap-1.5 text-xs text-amber-600">
                        <Utensils className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-mono text-[10px] uppercase font-semibold">Uang Makan</span>
                      </div>
                      <div className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatRupiah(rekapMingguan?.uangMakanTotal || 0)}
                      </div>
                      <span className="font-mono text-[9.5px] text-[var(--text-secondary)] block">
                        {rekapMingguan?.qualifyingDaysCount || 0} Hari (min. {rekapMingguan?.rates.minSlotUangMakan || 2} slot) @ {formatRupiah(rekapMingguan?.rates.uangMakanHarian || 15000)}
                      </span>
                    </div>
                  </div>

                  {/* Riwayat Sesi Selesai Minggu Ini */}
                  <div className="space-y-2 pt-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                      Riwayat Sesi Selesai Minggu Ini ({rekapMingguan?.completedList.length || 0})
                    </span>
                    {!rekapMingguan || rekapMingguan.completedList.length === 0 ? (
                      <div className="py-6 text-center border border-[var(--liquid-glass-border)] rounded-2xl font-mono text-[11px] text-[var(--text-muted)] bg-white/30 dark:bg-black/20">
                        Belum ada sesi latihan yang diselesaikan pada minggu ini.
                      </div>
                    ) : (
                      <div className="border border-[var(--liquid-glass-border)] rounded-2xl max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-black/5 dark:bg-white/5 border-b border-[var(--liquid-glass-border)] font-mono text-[10px] uppercase text-[var(--text-muted)] font-semibold">
                            <tr>
                              <th className="p-2.5">Tanggal</th>
                              <th className="p-2.5">Siswa</th>
                              <th className="p-2.5">Slot</th>
                              <th className="p-2.5 text-right">Fee</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--liquid-glass-border)] font-mono text-[11px]">
                            {rekapMingguan.completedList.map((j) => (
                              <tr key={j.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                                <td className="p-2.5 text-[var(--text-secondary)] font-medium whitespace-nowrap">
                                  {formatDateIndo(j.tanggal_sesi).slice(0, 6)}
                                </td>
                                <td className="p-2.5 font-bold text-[var(--text-primary)] truncate max-w-[120px]">
                                  {j.siswa?.nama || 'Siswa'}
                                </td>
                                <td className="p-2.5 text-[var(--text-secondary)]">
                                  Slot {j.slot_waktu?.urutan || 1}
                                </td>
                                <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  +{formatRupiah(rekapMingguan.rates.feeOperasional)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            /* Mode Bulanan */
            <>
              <div className="p-4 bg-white/50 dark:bg-black/30 border border-[var(--liquid-glass-border)] rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="font-bold text-[var(--text-primary)] text-sm block">
                    {staff.nama}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                    Periode: {monthLabel}
                  </span>
                </div>
                <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 uppercase font-semibold">
                  {staff.kode_staff || 'AM-00'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-4 border border-[var(--liquid-glass-border)] bg-white/50 dark:bg-black/30 rounded-2xl space-y-1 shadow-xs">
                  <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] font-semibold block">
                    Sesi Diselesaikan
                  </span>
                  <div className="text-xl font-mono font-bold text-[var(--text-primary)] tabular-nums">
                    {completedSessionsCount} <span className="text-xs font-normal text-[var(--text-secondary)]">Sesi</span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                    Tarif: {formatRupiah(ratePerSesi)}/sesi
                  </span>
                </div>

                <div className="p-4 border border-emerald-500/30 bg-emerald-500/10 rounded-2xl space-y-1 shadow-xs">
                  <span className="font-mono text-[10px] uppercase text-emerald-700 dark:text-emerald-300 font-semibold block">
                    Estimasi Komisi Sesi
                  </span>
                  <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatRupiah(komisiBulanan)}
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    Total berjalan bulan ini
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                  Riwayat Sesi Selesai Bulan Ini ({completedList.length})
                </span>
                {completedList.length === 0 ? (
                  <div className="py-6 text-center border border-[var(--liquid-glass-border)] rounded-2xl font-mono text-[11px] text-[var(--text-muted)]">
                    Belum ada sesi selesai pada periode bulan ini.
                  </div>
                ) : (
                  <div className="border border-[var(--liquid-glass-border)] rounded-2xl max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-black/5 dark:bg-white/5 border-b border-[var(--liquid-glass-border)] font-mono text-[10px] uppercase text-[var(--text-muted)] font-semibold">
                        <tr>
                          <th className="p-2.5">Tgl</th>
                          <th className="p-2.5">Siswa</th>
                          <th className="p-2.5 text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--liquid-glass-border)] font-mono text-[11px]">
                        {completedList.map((j) => (
                          <tr key={j.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                            <td className="p-2.5 text-[var(--text-secondary)] font-medium">
                              {formatDateIndo(j.tanggal_sesi).slice(0, 6)}
                            </td>
                            <td className="p-2.5 font-bold text-[var(--text-primary)] truncate max-w-[140px]">
                              {j.siswa?.nama || 'Siswa'}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              +{formatRupiah(ratePerSesi)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--liquid-glass-border)] bg-transparent flex justify-end gap-2">
          <button
            onClick={() => {
              sound.playTactileClick();
              onClose();
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-[#0F7A73] to-[#10B981] hover:brightness-110 text-white font-mono text-xs uppercase font-bold rounded-2xl transition-all shadow-sm active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
