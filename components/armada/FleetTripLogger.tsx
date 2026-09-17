'use client';

import React from 'react';
import { Kendaraan, KendaraanLogHarian } from '@/types/database';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { upsertKendaraanLog, deleteKendaraanLog } from '@/lib/actions/kendaraan';
import { sound } from '@/lib/sound/SoundFX';
import {
  Gauge,
  Car,
  Calendar,
  AlertCircle,
  TrendingUp,
  Trash2,
  Edit2,
  Loader2,
  Send,
  Fuel,
  Filter,
} from 'lucide-react';

interface FleetTripLoggerProps {
  kendaraanList: Kendaraan[];
  logs: KendaraanLogHarian[];
  onRefresh: () => void;
  initialKendaraanId?: string;
}

export function FleetTripLogger({
  kendaraanList,
  logs,
  onRefresh,
  initialKendaraanId,
}: FleetTripLoggerProps) {
  const [selectedKendaraanId, setSelectedKendaraanId] = React.useState<string>(
    initialKendaraanId || kendaraanList[0]?.id || ''
  );
  const [filterKendaraanId, setFilterKendaraanId] = React.useState<string>('all');
  const [tanggal, setTanggal] = React.useState<string>(getTodayDateString());
  const [odoOut, setOdoOut] = React.useState<string>('');
  const [odoIn, setOdoIn] = React.useState<string>('');
  const [slotCount, setSlotCount] = React.useState<string>('');
  const [catatan, setCatatan] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [editingLogId, setEditingLogId] = React.useState<string | null>(null);

  // Set default odoOut jika memilih kendaraan
  React.useEffect(() => {
    if (selectedKendaraanId && !editingLogId) {
      const selectedV = kendaraanList.find((k) => k.id === selectedKendaraanId);
      if (selectedV?.status?.odometer_terkini) {
        setOdoOut(String(selectedV.status.odometer_terkini));
      } else {
        setOdoOut('');
      }
    }
  }, [selectedKendaraanId, kendaraanList, editingLogId]);

  // Kalkulasi jarak tempuh otomatis pada form input
  const outNum = odoOut.trim() ? parseFloat(odoOut.replace(/\D/g, '')) : 0;
  const inNum = odoIn.trim() ? parseFloat(odoIn.replace(/\D/g, '')) : 0;
  const jarakKalkulasi = inNum > 0 && outNum > 0 && inNum >= outNum ? inNum - outNum : null;

  // Logika Pemrosesan Log sama seperti Dashboard Admin Console (KendaraanLogManager)
  const processedLogs = React.useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const vehicleGroups = new Map<string, KendaraanLogHarian[]>();
    for (const log of logs) {
      if (!vehicleGroups.has(log.kendaraan_id)) {
        vehicleGroups.set(log.kendaraan_id, []);
      }
      vehicleGroups.get(log.kendaraan_id)!.push(log);
    }

    const result: (KendaraanLogHarian & {
      effectiveJarak: number;
      isPeriodicDelta: boolean;
      isInitialBaseline: boolean;
      deltaFromDate?: string;
    })[] = [];

    for (const [, vLogs] of vehicleGroups.entries()) {
      // Urutkan kronologis naik untuk akumulasi
      vLogs.sort(
        (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
      );

      let lastKnownOdo: number | null = null;
      let lastKnownDate: string | null = null;

      for (const log of vLogs) {
        const outKm = log.odometer_basecamp_out;
        const inKm = log.odometer_basecamp_in;
        const currOdo = inKm !== null ? inKm : outKm;

        let effectiveJarak = 0;
        let isPeriodicDelta = false;
        let isInitialBaseline = false;
        let deltaFromDate: string | undefined = undefined;

        if (outKm !== null && inKm !== null && inKm > outKm) {
          effectiveJarak = inKm - outKm;
          lastKnownOdo = inKm;
          lastKnownDate = log.tanggal;
        } else if (currOdo !== null) {
          if (lastKnownOdo !== null && currOdo > lastKnownOdo) {
            effectiveJarak = currOdo - lastKnownOdo;
            isPeriodicDelta = true;
            deltaFromDate = lastKnownDate || undefined;
            lastKnownOdo = currOdo;
            lastKnownDate = log.tanggal;
          } else if (lastKnownOdo === null) {
            effectiveJarak = 0;
            isInitialBaseline = true;
            lastKnownOdo = currOdo;
            lastKnownDate = log.tanggal;
          } else {
            effectiveJarak = 0;
          }
        }

        result.push({
          ...log,
          effectiveJarak,
          isPeriodicDelta,
          isInitialBaseline,
          deltaFromDate,
        });
      }
    }

    // Urutkan kembali terbaru di atas
    result.sort((a, b) => {
      const dateDiff = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });

    return result;
  }, [logs]);

  // Filter logs berdasarkan armada jika dipilih
  const displayedLogs = React.useMemo(() => {
    if (filterKendaraanId === 'all') return processedLogs;
    return processedLogs.filter((l) => l.kendaraan_id === filterKendaraanId);
  }, [processedLogs, filterKendaraanId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedKendaraanId) {
      setErrorMsg('Pilih armada terlebih dahulu');
      return;
    }

    if (!outNum || outNum <= 0) {
      setErrorMsg('Odometer BC Out (km) wajib diisi');
      return;
    }

    if (inNum > 0 && inNum < outNum) {
      setErrorMsg('Odometer BC In tidak boleh lebih kecil dari Odometer BC Out');
      return;
    }

    try {
      setIsSubmitting(true);
      sound.click();

      const res = await upsertKendaraanLog({
        id: editingLogId || undefined,
        kendaraan_id: selectedKendaraanId,
        tanggal,
        odometer_basecamp_out: outNum,
        odometer_basecamp_in: inNum > 0 ? inNum : null,
        total_slot_selesai: slotCount ? Number(slotCount) : null,
        catatan: catatan.trim() || null,
      });

      if (res.success) {
        sound.pop();
        setEditingLogId(null);
        setOdoIn('');
        setSlotCount('');
        setCatatan('');
        onRefresh();
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan log trip');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (l: KendaraanLogHarian) => {
    sound.click();
    setEditingLogId(l.id);
    setSelectedKendaraanId(l.kendaraan_id);
    setTanggal(l.tanggal);
    setOdoOut(l.odometer_basecamp_out !== null ? String(l.odometer_basecamp_out) : '');
    setOdoIn(l.odometer_basecamp_in !== null ? String(l.odometer_basecamp_in) : '');
    setSlotCount(l.total_slot_selesai !== null ? String(l.total_slot_selesai) : '');
    setCatatan(l.catatan || '');
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus log trip ini?')) return;
    sound.trash();
    await deleteKendaraanLog(id);
    onRefresh();
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Form Catat Odometer Keluar / Masuk (Out Wajib, In Opsional) */}
      <div className="card-container bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                {editingLogId ? 'Edit Log Odometer' : 'Catat Odometer Trip Armada'}
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                BC Out (Wajib) & BC In (Opsional seperti Admin Console)
              </p>
            </div>
          </div>

          {editingLogId && (
            <button
              type="button"
              onClick={() => {
                setEditingLogId(null);
                setOdoIn('');
                setSlotCount('');
                setCatatan('');
                setErrorMsg(null);
              }}
              className="px-2 py-1 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 rounded-lg"
            >
              Batal Edit
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row: Pilih Armada & Tanggal */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Pilih Armada *
              </label>
              <select
                value={selectedKendaraanId}
                onChange={(e) => setSelectedKendaraanId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                required
              >
                {kendaraanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.plat_nomor} — {k.nama_kendaraan} ({k.tipe_transmisi})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Tanggal Trip *
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Row: Odo Out (Wajib) & Odo In (Opsional) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center justify-between mb-1">
                <span>Odo BC Out (km) *</span>
                <span className="text-[9px] text-[var(--text-muted)]">Keluar</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Contoh: 45000"
                  value={odoOut}
                  onChange={(e) => setOdoOut(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 pr-10"
                  required
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-[var(--text-muted)]">KM</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center justify-between mb-1">
                <span>Odo BC In (km)</span>
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-normal">Opsional</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Kosongkan jika jalan"
                  value={odoIn}
                  onChange={(e) => setOdoIn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 pr-10"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-[var(--text-muted)]">KM</span>
              </div>
            </div>
          </div>

          {/* Preview Jarak Tempuh Otomatis */}
          {jarakKalkulasi !== null && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Kalkulasi Jarak Trip Selesai:
              </span>
              <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                +{jarakKalkulasi.toLocaleString('id-ID')} KM
              </span>
            </div>
          )}

          {/* Row: Slot Selesai & Catatan */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Slot Selesai
              </label>
              <input
                type="number"
                placeholder="4"
                value={slotCount}
                onChange={(e) => setSlotCount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Catatan Rute / Kondisi
              </label>
              <input
                type="text"
                placeholder="Rute latihan Jakabaring, kondisi lancar"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Tombol Simpan */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{editingLogId ? 'Simpan Perubahan Log' : 'Simpan Log Odometer Trip'}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 2. Filter & Daftar Riwayat Trip Odometer Harian */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
            Riwayat Trip & Odometer Harian ({displayedLogs.length})
          </h4>

          {/* Quick Filter Armada Tabs */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterKendaraanId('all')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                filterKendaraanId === 'all'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]'
              }`}
            >
              Semua
            </button>
            {kendaraanList.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setFilterKendaraanId(k.id)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all truncate max-w-[80px] ${
                  filterKendaraanId === k.id
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]'
                }`}
              >
                {k.nama_kendaraan.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {displayedLogs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] text-xs text-[var(--text-muted)]">
            Belum ada catatan odometer trip harian.
          </div>
        ) : (
          <div className="space-y-2">
            {displayedLogs.map((l) => {
              const car = l.kendaraan || kendaraanList.find((k) => k.id === l.kendaraan_id);

              return (
                <div
                  key={l.id}
                  className="card-container p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs hover:border-[var(--border-strong)] transition-all space-y-2.5"
                >
                  {/* Top Header: Car & Date */}
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <Car className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-[var(--text-primary)]">
                            {car?.nama_kendaraan || 'Armada'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[var(--brand-primary)]">
                            {car?.plat_nomor}
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[var(--text-secondary)]" />
                          <span>{formatDateIndo(l.tanggal)}</span>
                          {l.tanggal_akhir && l.tanggal_akhir !== l.tanggal && (
                            <span> s/d {formatDateIndo(l.tanggal_akhir)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons (Edit & Delete) */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(l)}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        title="Edit Log"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(l.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                        title="Hapus Log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Middle Content: Odo Out, Odo In, & Jarak Tempuh */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* BC Out */}
                    <div className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5">
                      <span className="text-[9.5px] text-[var(--text-muted)] block uppercase font-bold">
                        BC Out
                      </span>
                      <span className="font-mono font-bold text-[var(--text-primary)] text-xs">
                        {l.odometer_basecamp_out !== null && l.odometer_basecamp_out !== undefined
                          ? `${l.odometer_basecamp_out.toLocaleString('id-ID')} km`
                          : '-'}
                      </span>
                    </div>

                    {/* BC In */}
                    <div className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5">
                      <span className="text-[9.5px] text-[var(--text-muted)] block uppercase font-bold">
                        BC In
                      </span>
                      <span className="font-mono font-bold text-[var(--text-primary)] text-xs">
                        {l.odometer_basecamp_in !== null && l.odometer_basecamp_in !== undefined
                          ? `${l.odometer_basecamp_in.toLocaleString('id-ID')} km`
                          : '-'}
                      </span>
                    </div>

                    {/* Jarak Tempuh */}
                    <div className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col justify-center items-center">
                      <span className="text-[9.5px] text-[var(--text-muted)] block uppercase font-bold">
                        Jarak Tempuh
                      </span>
                      {l.effectiveJarak > 0 ? (
                        <div>
                          <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                            +{l.effectiveJarak.toLocaleString('id-ID')} km
                          </span>
                          {l.isPeriodicDelta && l.deltaFromDate && (
                            <div className="text-[8.5px] text-[var(--text-muted)] leading-tight">
                              sejak {formatDateIndo(l.deltaFromDate).split(' ')[0]}
                            </div>
                          )}
                        </div>
                      ) : l.isInitialBaseline ? (
                        <span className="text-[9.5px] text-blue-600 dark:text-blue-400 font-bold">
                          Titik Awal
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-[var(--text-muted)]">0 km</span>
                      )}
                    </div>
                  </div>

                  {/* Optional info: Catatan / BBM */}
                  {(l.catatan || l.bbm_liter || l.bbm_nominal) && (
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-[var(--text-secondary)] border-t border-[var(--border)]">
                      {l.catatan ? (
                        <span className="italic text-[10.5px] truncate max-w-[240px]">
                          "{l.catatan}"
                        </span>
                      ) : (
                        <span />
                      )}

                      {(l.bbm_liter || l.bbm_nominal) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                          <Fuel className="w-3 h-3" />
                          <span>
                            {l.bbm_liter ? `${l.bbm_liter} L` : ''} {l.bbm_jenis?.toUpperCase() || 'BBM'}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
