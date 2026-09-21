'use client';

import React from 'react';
import { JadwalSesi, Kendaraan } from '@/types/database';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { getJadwalByTanggal } from '@/lib/actions/jadwal';
import { sound } from '@/lib/sound/SoundFX';
import {
  Calendar,
  Clock,
  User,
  Car,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface FleetScheduleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  kendaraanList: Kendaraan[];
}

export function FleetScheduleDrawer({
  isOpen,
  onClose,
  kendaraanList,
}: FleetScheduleDrawerProps) {
  const [tanggal, setTanggal] = React.useState<string>(getTodayDateString());
  const [jadwalList, setJadwalList] = React.useState<JadwalSesi[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadSchedule = React.useCallback(async (targetDate: string) => {
    try {
      setLoading(true);
      const rows = await getJadwalByTanggal(targetDate);
      setJadwalList(rows);
    } catch (err) {
      console.error('Error loading schedule:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadSchedule(tanggal);
    }
  }, [isOpen, tanggal, loadSchedule]);

  if (!isOpen) return null;

  // Kelompokkan sesi per armada
  const sessionsByVehicle: Record<string, JadwalSesi[]> = {};
  for (const k of kendaraanList) {
    sessionsByVehicle[k.id] = [];
  }

  for (const s of jadwalList) {
    if (s.kendaraan_id && sessionsByVehicle[s.kendaraan_id]) {
      sessionsByVehicle[s.kendaraan_id].push(s);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
      <div className="bg-[var(--card-bg)] border border-[var(--border-strong)] rounded-2xl p-4 max-w-lg w-full shadow-2xl space-y-3.5 animate-in slide-in-from-bottom-3 max-h-[90vh] flex flex-col">
        {/* Header Drawer */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                Alokasi Jadwal Armada
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                Penggunaan unit oleh instruktur & siswa per slot
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => loadSchedule(tanggal)}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]"
          />
          <span className="text-xs text-[var(--text-muted)] font-medium">
            {jadwalList.length} Sesi Terjadwal
          </span>
        </div>

        {/* Schedule List Content per Vehicle */}
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-[var(--text-muted)]">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-xs">Memuat alokasi armada...</span>
            </div>
          ) : kendaraanList.length === 0 ? (
            <p className="text-center text-xs text-[var(--text-muted)] py-8">
              Tidak ada data armada aktif.
            </p>
          ) : (
            kendaraanList.map((k) => {
              const sessions = sessionsByVehicle[k.id] || [];

              return (
                <div
                  key={k.id}
                  className="card-container p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-[var(--brand-primary)]" />
                      <span className="text-xs font-black text-[var(--text-primary)]">
                        {k.plat_nomor} — {k.nama_kendaraan}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {sessions.length} Sesi
                    </span>
                  </div>

                  {sessions.length === 0 ? (
                    <p className="text-[11px] text-[var(--text-muted)] italic py-1 text-center">
                      Standby / Belum ada sesi teralokasi di tanggal ini.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {sessions.map((s) => {
                        const slot = s.slot_waktu;
                        const instruktur = s.instruktur;
                        const siswa = s.siswa;

                        return (
                          <div
                            key={s.id}
                            className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-[var(--brand-primary)] shrink-0" />
                                <span className="font-mono font-bold text-[var(--text-primary)]">
                                  {slot?.jam_mulai ? slot.jam_mulai.slice(0, 5) : 'Slot'}
                                  {slot?.jam_selesai ? ` - ${slot.jam_selesai.slice(0, 5)}` : ''}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  (Sesi {s.nomor_sesi_ke}/{s.total_sesi_paket})
                                </span>
                              </div>
                              <div className="text-[11px] text-[var(--text-secondary)] font-medium truncate mt-0.5">
                                Instruktur: <span className="font-bold">{instruktur?.nama || '-'}</span> • Siswa: <span className="font-bold">{siswa?.nama || '-'}</span>
                              </div>
                            </div>

                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase shrink-0 ${
                                s.status_sesi === 'selesai'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : s.status_sesi === 'batal'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {s.status_sesi}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
