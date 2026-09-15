'use client';

import React from 'react';
import { Kendaraan, KendaraanLogHarian } from '@/types/database';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { upsertKendaraanLog, quickInputBasecampIn, deleteKendaraanLog } from '@/lib/actions/kendaraan';
import { sound } from '@/lib/sound/SoundFX';
import {
  Gauge,
  Plus,
  ArrowRight,
  Car,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Trash2,
  Edit2,
  X,
  Loader2,
  Send,
  Navigation,
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
  const [tanggal, setTanggal] = React.useState<string>(getTodayDateString());
  const [odoOut, setOdoOut] = React.useState<string>('');
  const [odoIn, setOdoIn] = React.useState<string>('');
  const [slotCount, setSlotCount] = React.useState<string>('');
  const [catatan, setCatatan] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingLogId, setEditingLogId] = React.useState<string | null>(null);

  // Quick In modal state for active out-trips
  const [quickInLog, setQuickInLog] = React.useState<KendaraanLogHarian | null>(null);
  const [quickInKm, setQuickInKm] = React.useState<string>('');
  const [isQuickInLoading, setIsQuickInLoading] = React.useState(false);

  // Temukan trip aktif (Odo Keluar terisi, Odo Masuk belum)
  const activeTrips = logs.filter(
    (l) => l.odometer_basecamp_out !== null && (l.odometer_basecamp_in === null || l.odometer_basecamp_in === undefined)
  );

  // Set default odoOut jika memilih kendaraan
  React.useEffect(() => {
    if (selectedKendaraanId && !editingLogId) {
      const selectedV = kendaraanList.find((k) => k.id === selectedKendaraanId);
      if (selectedV?.status?.odometer_terkini) {
        setOdoOut(String(selectedV.status.odometer_terkini));
      }
    }
  }, [selectedKendaraanId, kendaraanList, editingLogId]);

  // Kalkulasi jarak tempuh otomatis
  const outNum = parseFloat(odoOut) || 0;
  const inNum = parseFloat(odoIn) || 0;
  const jarakKalkulasi = inNum > outNum ? inNum - outNum : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKendaraanId) return;

    try {
      setIsSubmitting(true);
      sound.click();

      const res = await upsertKendaraanLog({
        id: editingLogId || undefined,
        kendaraan_id: selectedKendaraanId,
        tanggal,
        odometer_basecamp_out: odoOut ? Number(odoOut) : null,
        odometer_basecamp_in: odoIn ? Number(odoIn) : null,
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
        alert(res.error || 'Gagal menyimpan log trip');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInLog || !quickInKm) return;

    try {
      setIsQuickInLoading(true);
      sound.click();

      const res = await quickInputBasecampIn(quickInLog.id, Number(quickInKm), getTodayDateString());
      if (res.success) {
        sound.pop();
        setQuickInLog(null);
        setQuickInKm('');
        onRefresh();
      } else {
        alert(res.error || 'Gagal menyimpan Odometer Masuk');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsQuickInLoading(false);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus log trip ini?')) return;
    sound.trash();
    await deleteKendaraanLog(id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* 1. Quick-In Alert Banner jika ada mobil sedang jalan */}
      {activeTrips.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Navigation className="w-3.5 h-3.5 animate-pulse" />
            <span>Armada Sedang di Jalan ({activeTrips.length})</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {activeTrips.map((trip) => {
              const car = trip.kendaraan || kendaraanList.find((k) => k.id === trip.kendaraan_id);
              return (
                <div
                  key={trip.id}
                  className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Car className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-[var(--text-primary)]">
                          {car?.plat_nomor || 'Armada'}
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                          ({car?.nama_kendaraan})
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] font-mono">
                        Odo Out: <span className="font-bold">{trip.odometer_basecamp_out?.toLocaleString('id-ID')} KM</span> • {formatDateIndo(trip.tanggal)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sound.click();
                      setQuickInLog(trip);
                      setQuickInKm(trip.odometer_basecamp_out ? String(trip.odometer_basecamp_out + 10) : '');
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-sm transition-all active:scale-95 flex items-center gap-1 shrink-0"
                  >
                    <span>Input Odo In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Form Catat Odometer Keluar / Masuk */}
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
              <p className="text-[10px] text-[var(--text-muted)]">Basecamp Out & Basecamp In Harian</p>
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
              }}
              className="px-2 py-1 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 rounded-lg"
            >
              Batal Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row: Pilih Armada & Tanggal */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Pilih Armada
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
                Tanggal Trip
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

          {/* Row: Odo Out & Odo In */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center justify-between mb-1">
                <span>Odo Keluar (Out)</span>
                <span className="text-[9px] text-[var(--text-muted)]">Basecamp</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Contoh: 167900"
                  value={odoOut}
                  onChange={(e) => setOdoOut(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-[var(--text-muted)]">KM</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center justify-between mb-1">
                <span>Odo Masuk (In)</span>
                <span className="text-[9px] text-[var(--text-muted)]">Opsional</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Contoh: 168050"
                  value={odoIn}
                  onChange={(e) => setOdoIn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-[var(--text-muted)]">KM</span>
              </div>
            </div>
          </div>

          {/* Preview Jarak Tempuh Otomatis */}
          {jarakKalkulasi !== null && (
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Jarak Tempuh Terhitung:
              </span>
              <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                +{jarakKalkulasi} KM
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

      {/* 3. Modal Quick-In jika diklik dari banner atas */}
      {quickInLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
          <div className="bg-[var(--card-bg)] border border-[var(--border-strong)] rounded-2xl p-4 max-w-sm w-full shadow-2xl space-y-3.5 animate-in slide-in-from-bottom-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-[var(--text-primary)]">
                    Input Odometer Masuk
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {quickInLog.kendaraan?.plat_nomor || 'Armada'} — {formatDateIndo(quickInLog.tanggal)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickInLog(null)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickInSubmit} className="space-y-3">
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)] text-xs flex justify-between">
                <span className="text-[var(--text-muted)]">Odometer Keluar:</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">
                  {quickInLog.odometer_basecamp_out?.toLocaleString('id-ID')} KM
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                  Odometer Masuk (Basecamp In)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={quickInKm}
                    onChange={(e) => setQuickInKm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: 168020"
                    required
                    autoFocus
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] font-bold text-[var(--text-muted)]">KM</span>
                </div>
              </div>

              {quickInKm && quickInLog.odometer_basecamp_out && Number(quickInKm) > quickInLog.odometer_basecamp_out && (
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex justify-between">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">Jarak Trip:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    +{Number(quickInKm) - quickInLog.odometer_basecamp_out} KM
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setQuickInLog(null)}
                  className="flex-1 py-2 rounded-xl border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold text-[var(--text-primary)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isQuickInLoading}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1"
                >
                  {isQuickInLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Selesaikan Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Daftar Riwayat Trip Odometer */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
          Riwayat Trip & Odometer Harian ({logs.length})
        </h4>

        <div className="space-y-2">
          {logs.slice(0, 15).map((l) => {
            const car = l.kendaraan || kendaraanList.find((k) => k.id === l.kendaraan_id);
            const isTripDone = l.odometer_basecamp_in !== null;

            return (
              <div
                key={l.id}
                className="card-container p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs hover:border-[var(--border-strong)] transition-all flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isTripDone
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[var(--text-primary)]">
                        {car?.plat_nomor || 'Armada'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {formatDateIndo(l.tanggal)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-secondary)] mt-0.5">
                      <span>Out: {l.odometer_basecamp_out?.toLocaleString('id-ID') || '-'}</span>
                      <span>→</span>
                      <span>In: {l.odometer_basecamp_in?.toLocaleString('id-ID') || 'Di Jalan'}</span>
                    </div>

                    {l.catatan && (
                      <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[200px] sm:max-w-xs mt-0.5">
                        {l.catatan}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {l.jarak_tempuh ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-black">
                        +{l.jarak_tempuh} KM
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                        Di Jalan
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(l)}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      title="Edit Log"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(l.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500"
                      title="Hapus Log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
